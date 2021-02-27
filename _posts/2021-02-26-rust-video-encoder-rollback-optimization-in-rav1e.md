---
layout: post
title: Video encoder rollback optimization in rav1e
location: Suwon
published: true
tags: av1, optimization, opensource, video
---

This is the story of a specific optimization that gave a significant speed-up in rav1e, up to 32% faster in some benchmarks. Small encoder speed-ups translate to large cost savings for anyone processing video at high volume. For readers unfamiliar with rav1e, we will start with some background. Otherwise, you may [skip ahead](#the-cost-of-rolling-back).

The Alliance for Open Media is an effort founded by Google, Cisco and Mozilla, with many other companies joining them over the past few years. The Alliance for Open Media AV1 video codec is the first to be released as a result of this effort. We will refer to it as AV1.

[rav1e is an AV1 encoder](https://github.com/xiph/rav1e) -- written primarily in the [Rust programming language](https://www.rust-lang.org/), its goal is to be safe and fast. [dav1d is an AV1 decoder](https://code.videolan.org/videolan/dav1d) -- written in C with a large collection of assembly, it is very fast. Notably, rav1e integrates the dav1d assembly along with its own encoding-specific assembly -- they now outweigh the Rust code in rav1e.

## Architecture of an AV1 encoder

AV1 has a conventional block transform video coding architecture with motion compensation. A video is a sequence of frames which are divided into one or more tiles. Tiles are divided into large squares called superblocks -- either 64 or 128 pixels in width and height for AV1. Superblocks are partitioned recursively into smaller square or rectangular blocks.

[![AV1 Partitioning](/img/AV1_Partitioning.svg)](https://commons.wikimedia.org/wiki/File:AV1_Partitioning.svg)

Each block may be predicted by neighboring blocks in the same tile or by a motion projection of regions in other frames. There are many modes to choose from for both of these cases. The core of the video encoder is deciding how to partition the blocks, which prediction mode and reference to use for each block and how to transform the difference. The following diagram illustrates the range of techniques available in AV1.

[![The technology inside AV1](/img/The_Technology_Inside_Av1.svg)](https://commons.wikimedia.org/wiki/File:The_Technology_Inside_Av1.svg)


## Rate-distortion optimization (RDO)

The process for guiding encoding choices is called rate-distortion optimization, commonly abbreviated as RDO. For each set of choices there is a trade between the **rate** of bits that describe the decisions and how much the decoded frame is **distorted** compared to the original. The ratio of this trade-off can be estimated for a given quality range.

In rav1e we proceed a superblock at a time within each tile -- committing the bitstream, pixels and *context* before moving onto the next superblock. Within a superblock, we encode each candidate mode and measure the precise bit-rate and distortion. After measuring these, we *turn back time* and try the next candidate until we determine the best choice. The process of *turning back time* (called **rollback**) and the nature of the **context** are the focus of this story.

Not every AV1 encoder uses precise bit-rate in this way. It is possible to build an estimated model of bit-rates beforehand. This exchanges speed for accuracy and is suited to low-complexity encoding. We will continue to review techniques in rav1e as the encoder matures.

## The cost of rolling back

The current generation of video codecs achieve high compression efficiency by carrying a rather large context, which is adapted as the bitstream is decoded (and encoded). The two components of the AV1 context are a table of *cumulative distribution functions* (CDF context) and the decisions at earlier neighbors (block context). Each decision is represented by a symbol and the number of bits for a symbol is determined by its probability. The probabilities for a set of symbols are modeled by a CDF. The block context is used to select a CDF from the table when writing to the bitstream.

The story begins with the CDF context over 17kB in size and the block context over 4kB. The rollback design was a full copy for both. This design required very little code and was obviously correct, so it was a good start when rollback was added. We knew there were faster and more complex designs at the time but they would have been overshadowed by other performance issues. Many speed enhancements have been implemented since then, increasing the proportion of rollback in the remaining encoding time. When profiling our highest-quality (slowest) speed setting with [linux-perf](https://perf.wiki.kernel.org/), we found that [unaligned memmove was more than 20% of encode time](https://github.com/xiph/rav1e/issues/2646)!
```
$ perf record rav1e Bosphorus_1920x1080_120fps_420_8bit_YUV.y4m \
    --output /dev/null --tiles 4 --threads 4 --limit 64 --speed 0
$ perf report
# Overhead  Command  Shared Object       Symbol                                   
# ........  .......  ..................  ...................................
    20.33%  rav1e    libc-2.30.so        [.] __memmove_avx_unaligned_erms
    11.39%  rav1e    rav1e               [.] rav1e::encoder::encode_tx_block
```
We collected a detailed call-graph on a 10-frame run with [callgrind](https://valgrind.org/docs/manual/cl-manual.html) and identified the dominant callers of `__memmove_avx_unaligned_erms` with [KCachegrind](https://apps.kde.org/en/kcachegrind).
```
32.11% rav1e::rdo::rdo_tx_size_type (rav1e: rdo.rs, ...)
 3.81% rav1e::rdo::luma_chroma_mode_rdo::{{closure}} (rav1e: rdo.rs, ...)
```
Under the Source Code tab, we were able to see which inline functions were responsible for the calls.
```rust
impl ContextWriter {
  pub const fn checkpoint(&self) -> ContextWriterCheckpoint {
    ContextWriterCheckpoint { fc: *self.fc, bc: self.bc.checkpoint() }
// 373389 call(s) to '__memmove_avx_unaligned_erms'
  }

  pub fn rollback(&mut self, checkpoint: &ContextWriterCheckpoint) {
    *self.fc = checkpoint.fc;
// 887205 call(s) to '__memmove_avx_unaligned_erms'
    self.bc.rollback(&checkpoint.bc);
```
```rust
impl BlockContext {
  pub fn rollback(&mut self, checkpoint: &BlockContextCheckpoint) {
    self.cdef_coded = checkpoint.cdef_coded;
    self.above_partition_context = checkpoint.above_partition_context;
// 887203 call(s) to '__memmove_avx_unaligned_erms'
    self.left_partition_context = checkpoint.left_partition_context;
    self.above_tx_context = checkpoint.above_tx_context;
// 887203 call(s) to to '__memmove_avx_unaligned_erms'
    self.left_tx_context = checkpoint.left_tx_context;
    self.above_coeff_context = checkpoint.above_coeff_context;
// 887203 call(s) to to '__memmove_avx_unaligned_erms'
    self.left_coeff_context = checkpoint.left_coeff_context;
  }
```
We had a strong indication that the checkpoint and rollback of `BlockContext` and `CDFContext` were the major sources of `__memmove_avx_unaligned_erms` calls. Although an individual copy of `CDFContext` is quite fast, it was occurring 138 thousand times per frame. This added up to 2.45GB per frame of memory throughput. 

### How much data are we actually rolling back?

There is a harness in rav1e to track the CDF updates via the `desync_finder` feature. [The same harness was modified](https://github.com/rust-av/rav1e/commit/6165e4b457afc991275d1d7af0b131db61721c76) to extract fine-grained statistics on CDF access.

[![Rollback sizes histogram](/img/rollback_sizes.svg)](/img/rollback_sizes.svg)

The largest amount of rollbacks impact only a small subset of `CDFContext`.

## Not our first rodeo: reusing a design

A major event in opensource video coding was the development and release of the [Theora](https://www.theora.org/) format from 2001 to 2004. Work to enhance the reference encoder continued through to 2009. This included pschovisual optimization, adaptive quantization, rate control and encoder speed-ups. This effort was succeeded by the [Daala](https://xiph.org/daala/) project which ultimately became one of the seeds of AV1. Theora, Daala and rav1e share a home at [Xiph.Org](https://www.xiph.org/), with the core contributors also active in rav1e.

The issue of excessive memory copying was raised at a rav1e weekly meeting and it was noted that a similar, smaller problem had been solved in Theora. We had a robust discussion about adapting that design to rav1e and the likely drawbacks of alternative approaches.

The core concept was to introduce an undo log of changes to CDFs. We would keep the single collection of CDFs representing the current state, `CDFContext`. Any writes to a CDF would be intercepted and the prior content copied to the log along with the location within `CDFContext`. To take a checkpoint we would only need to record the position in the log. To rollback we would iterate from the end of the log to the checkpoint, restoring the content of each modified CDF. The lifetime of the log content would be tied to a superblock, clearing the log whenever one is committed. 

Work began immediately on investigating what changes would be necessary to support the new design. We appropriated the `desync_finder` feature to verify that we could intercept all writes to CDFs. We found a few places where the `desync_finder` had not been integrated as AV1 features were added to rav1e. Once each of these had been corrected[^pr2659], we had a single intercept point where a CDF log implementation could be injected.

## The road to 1.32 times faster

There were 22 patches merged from the initial CDF log implementation to extracting the last percent of speed-up. The impact varied between encoding speed presets. The largest impact was at speed 1, achieving a speed-up of 1.32 times with a single tile on a single thread for 10 frames of 1080p. The following sections describe each change topic and the effect on encoding speed and data structure sizes.

[![Speed up at speed 1, single tile and thread](/img/speedup_progression.svg)](/img/speedup_progression.svg)

### A safe start

At first we focused on expressing the design clearly with speed taking second place. For each CDF write, we would compute the offset with `CDFContext`, and record the offset, CDF length and content to the log. An important insight was that the `CDFContext` struct was small enough that all offsets could fit into `u16`, the same type as elements of CDFs.
```rust
pub fn push(&mut self, cdf: &[u16]) {
  let offset = cdf.as_ptr() as usize - self.base;
  debug_assert!(offset <= u16::MAX.into());
  self.data.extend_from_slice(cdf);
  self.data.extend_from_slice(&[offset as u16, cdf.len() as u16]);
}
```
Rollback also followed Rust idioms, peeling back the log elements in reverse. The exception was writing the content back into `CDFContext` at arbitrary offsets, which is naturally an unsafe operation. If we ensure the offsets came from valid locations in `CDFContext`, we may be confident that they are valid when copying the data back.
```rust
pub fn rollback(&mut self, fc: &mut CDFContext, checkpoint: usize) {
  let base = fc as *mut _ as *mut u8;
  while self.data.len() > checkpoint {
    if let Some(len) = self.data.pop() {
      if let Some(offset) = self.data.pop() {
        let len = len as usize;
        let src = &self.data[self.data.len() - len];
        unsafe {
          let dst = base.add(offset as usize) as *mut u16;
          dst.copy_from_nonoverlapping(src, len);
        }
        self.data.truncate(self.data.len() - len);
      }
    }
  }
}
```
This code reduced encoding time by **10.5%**, reduced the CDF context checkpoint size from 17kB to **8 bytes** and added a new CDF log preallocated at **512kB**.

### Removing the guardrails

Now that we had a baseline, we could rewrite the internals of `push()` and `rollback()` with a focus on speed. The core insight is that CDF sizes have a small upper bound. Constant-sized copies translate to a few fast instructions while variable-sized copies translate either to iteration or branching. We moved to constant-sized copies by admitting some over-read and over-write. This required padding `CDFContext` by 0.2% to ensure the over-writes are contained within it. We also found that by reserving space in advance, we could start copying immediately on entering `push()`. The `data` field became a vector of `[u16; CDF_LEN_MAX + 1]` arrays, with the final element holding the offset.
```rust
pub fn push(&mut self, cdf: &[u16]) {
  let offset = cdf.as_ptr() as usize - self.base;
  debug_assert!(offset <= u16::MAX.into());
  unsafe {
    // Maintain an invariant of non-zero spare capacity, so that branching
    // may be deferred until writes are issued. Benchmarks indicate this is
    // faster than first testing capacity and possibly reallocating.
    let len = self.data.len();
    debug_assert!(len < self.data.capacity());
    let entry = self.data.get_unchecked_mut(len);
    let dst = entry.as_mut_ptr();
    dst.copy_from_nonoverlapping(cdf.as_ptr(), CDF_LEN_MAX);
    entry[CDF_LEN_MAX] = offset as u16;
    self.data.set_len(len + 1);
    self.data.reserve(1);
  }
}
```
Constant-sized access to the log allowed us to simplify `rollback()`. Rather than cascading checks for emptiness of the log and updating the state of the vector continuously, we could have a very tight loop that only copied data and truncate the log afterward.
```rust
pub fn rollback(&mut self, fc: &mut CDFContext, checkpoint: usize) {
  let base = fc as *mut _ as *mut u8;
  let mut len = self.data.len();
  unsafe {
    while len > checkpoint {
      len -= 1;
      let src = self.data.get_unchecked_mut(len);
      let offset = src[CDF_LEN_MAX] as usize;
      let dst = base.add(offset) as *mut u16;
      dst.copy_from_nonoverlapping(src.as_ptr(), CDF_LEN_MAX);
    }
    self.data.set_len(len);
  }
}
```
Implementing this part of the design reduced encoding time by **6%** but the CDF log preallocation grew to **1.125MB**.[^pr2661]

### Saving memory with a little speed as a bonus

At this point we had achieved a substantial speed-up but the log allocation had doubled. This was because about 90% of writes were for 4-symbol CDFs or smaller. The solution was to split `CDFContext` into separate regions for small and large CDFs and to also split the log. The logs shared an implementation parameterized by the maximum supported CDF size. We used an [associated constant](https://doc.rust-lang.org/edition-guide/rust-2018/trait-system/associated-constants.html) on a trait to express this specialization.
```rust
trait CDFContextLogSize {
  const CDF_LEN_MAX: usize;
}
trait CDFContextLogOps: CDFContextLogSize {
  fn push(log: &mut CDFContextLogBase, cdf: &[u16]) {
    // ...
  }
  fn rollback(
    log: &mut CDFContextLogBase, fc: &mut CDFContext, checkpoint: usize,
  ) {
    // ...
  }

struct CDFContextLogSmall(CDFContextLogBase);
struct CDFContextLogLarge(CDFContextLogBase);

impl CDFContextLogOps for CDFContextLogSmall {}
impl CDFContextLogOps for CDFContextLogLarge {}
impl CDFContextLogSize for CDFContextLogSmall {
  const CDF_LEN_MAX: usize = 4;
}
impl CDFContextLogSize for CDFContextLogLarge {
  const CDF_LEN_MAX: usize = 16;
}
```
To keep the rollback loops independent, we needed to ensure that the writes cannot overlap for any interleaving of the logs. Padding between fields of `CDFContext` would be effective but it was not a satisfying solution. We instead sorted the fields by CDF size, so that if the last field in a region matched the write size no padding would be required. [^pr2664]

There was something we needed to address before this split at 4 symbols would produce a tight rollback loop. The probability model in AV1 features a variable adaptation rate. Each CDF is strongly adapted for the first 32 symbols coded in a tile and at a constant rate for any further symbols. There is a counter associated with each CDF for this purpose. To this point rav1e had been using the same layout for CDFs as libaom: `[u16; nsyms + 1]` with the first `nsyms` elements holding the cumulative probability and the last element holding the counter. We borrowed a trick from dav1d to condense the layout[^pr2663]:
* The probabilities are stored in the form `1 - P` and the final value is always zero.
* The values are always right-shifted before being used to code a symbol.
* We can stuff a value into the lower bits and maintain the zero-value expectation.
* The maximum counter value is small enough to fit in the lower bits.
* We can merge the counter with the element for the final symbol.
* Like dav1d, we can use `[u16; nsyms]` for each CDF.

The following snippets of x86_64 assembly were emitted by LLVM (hand-formatted and annotated for human readability) and show just how well the Rust compiler was able to optimize this code with `target-feature=+avx2`.

`CDFContextLogSmall::rollback()` loop, copying CDFs from 2 to 4 symbols:
```
.LBB415_3:
 lea       rax, [rcx-5]           ; rcx: log length
 movzx    r10d, word [r9+2*rcx-2] ; r9:  log base pointer
 mov       rcx, [r9+2*rcx-10]     ; r10: CDFContext offset
 mov [rsi+r10], rcx               ; rsi: CDFContext base pointer
 mov       rcx, rax               ; rax: new log length
 cmp       rax, r8                ; r8:  log checkpoint
 ja .LBB415_3
```
`CDFContextLogLarge::rollback()` loop, copying CDFs from 5 to 16 symbols:
```
.LBB415_7:
 lea           rax, [rcx-17]          ; rcx: log length
 movzx         edx, word [r9+2*rcx-2] ; r9:  log base pointer
 vmovups      ymm0, [r9+2*rcx-32]     ; rdx: CDFContext offset
 vmovups [rsi+rdx], ymm0              ; rsi: CDFContext base pointer
 mov           rcx, rax               ; rax: new log length
 cmp           rax, r8                ; r8:  log checkpoint
 ja .LBB415_7
```

Although maintaining speed was sufficient for this change, encoding time was reduced by **0.6%**. Partitioning the fields of `CDFContext` by CDF size and condensing the CDF layout reduced the size of`CDFContext` by 14.8% to **15kB**. The CDF log allocation was reduced by 54% overall to **512kB** for small writes and **16kB** for large writes.

### Moving on to the second source

With `CDFContext` no longer causing frequent calls to `memmove`, `BlockContext` came into focus. `BlockContext` holds information for a row of superblocks, but recall that checkpoint and rollback are scoped to the current superblock. `BlockContextCheckpoint` was sized not only to current row of superblocks but also the maximum width allowed in a tile. Changing it to hold data only for the current superblock reduced its size by **96.6%** down to **160 bytes**.
```rust
self.above_tx_context[x..][..MIB_SIZE]
.copy_from_slice(&checkpoint.above_tx_context);
```
No unsafe block was necessary for this change thanks to coercing arrays to slices and calling `copy_from_slice`. The Rust compiler had enough information from the array types to simplify these calls to a few instructions. This reduced encoding time by **4.8%**.[^pr2666]

### Wait, what is that remaining 3%?

With `CDFContext` and `BlockContext` now optimized, we expected to have completed. Profiling showed that `memmove` calls still accounted for about 3% of encoding time. Following the call-graph through Kcachegrind again, we found the calls where functions `ac_q` and `dc_q` were inline. This didn't make sense because these functions were supposed to read from static lookup tables. We fortunately have a reviewer with deep Rust knowledge and they were able to identify the subtle mistake that was causing the full table copy on every read.
```rust
let &table = match bit_depth {
  8 => &dc_qlookup_Q3,
  10 => &dc_qlookup_10_Q3,
  12 => &dc_qlookup_12_Q3,
  _ => unimplemented!(),
};
```
Changing `&table` to `table` in this statement (and the similar statement in `ac_q`) eliminated an implicit copy onto the stack, reducing the encoding time by **2.5%**.[^pr2667]

### Reading assembly leads to restlessness

Computers notoriously do what we say rather than what we mean. Looking at the assembly generated for `symbol_with_update()` revealed some places we could express our intent more clearly to the compiler.

We changed the tail of `push()` to check before calling `Vec::reserve()`. The length is already known immediately before and the capacity is very likely in CPU cache. This gives the compiler more options with control flow when the function is inline and is friendly to a branch predictor.
```rust
log.data.set_len(new_len);
if Self::CDF_LEN_MAX + 1 > capacity.wrapping_sub(new_len) {
  log.data.reserve(Self::CDF_LEN_MAX + 1);
}
```
The `symbol()` function reads from the CDF to calculate the symbol probability. It was difficult to give enough information to the compiler for it to infer that accesses are always inbounds. So we replaced with unchecked access guarded by debug assertions.
```rust
debug_assert!(s < cdf.len());
// The above is stricter than the following overflow check: s <= cdf.len()
let nms = cdf.len() - s;
let fl = if s > 0 { unsafe { *cdf.get_unchecked(s - 1) } } else { 32768 };
let fh = unsafe { *cdf.get_unchecked(s) };
```
We rewrote access to the counter in `update_cdf()` with Rust idioms such that there was no path to a panic. We added a limit to iterations of the update loop, as a hint to the loop unroller of the compiler.
```rust
pub fn update_cdf(cdf: &mut [u16], val: u32) {
  use crate::context::CDF_LEN_MAX;
  let nsymbs = cdf.len();
  let mut rate = 3 + (nsymbs >> 1).min(2);
  if let Some(count) = cdf.last_mut() {
    rate += (*count >> 4) as usize;
    *count += 1 - (*count >> 5);
  } else {
    return;
  }
    // Single loop (faster)
  for (i, v) in
    cdf[..nsymbs - 1].iter_mut().enumerate().take(CDF_LEN_MAX - 1)
    {
    if i as u32 >= val {
      *v -= *v >> rate;
    } else {
      *v += (32768 - *v) >> rate;
    }
  }
}
```
These changes altogether reduced encoding time by **1.7%**.[^pr2671]

### Lining up for the final shot

The future possibility of using [const generics](https://rust-lang.github.io/rfcs/2000-const-generics.html) was raised during code review. Exploring this idea with a Rust beta toolchain revealed that it would help to only pass CDFs as arrays. While auditing the use of slice with CDFs, we found that some small CDFs had not been partitioned. As in libaom, smaller CDFs were padded to share multi-arrays with related CDFs. This became an urgent fix rather than an explorative task, due to the `CDFContext` layout constraint introduced for log partitioning. Ensuring that all CDFs were packed in matching arrays reduced `CDFContext` size by **27.1%** to **11kB** and prevented a potential concurrency issue with future changes to the encoder. These changes prepared the way for final optimization in the series.

### That final 1% bonus

A prototype of passing CDF arrays to `symbol_with_update()` showed some speed-up but involved quite a large set of changes. Further analysis showed that all of that speed-up could be achieved by specializing only for 2-, 3- and 4-symbol CDFs. The interface change was necessary because there is no inlining across the `dyn` boundary. We used macros to avoid repetition but the below code is expanded for clarity.
```rust
pub trait Writer {
  /// Write a symbol s, using the passed in cdf reference; updates the referenced cdf.
  fn symbol_with_update(&mut self, s: u32, cdf: &mut [u16], log: &mut CDFContextLog);
  fn symbol_with_update_2(&mut self, s: u32, cdf: &mut [u16; 2], log: &mut CDFContextLog);
  fn symbol_with_update_3(&mut self, s: u32, cdf: &mut [u16; 3], log: &mut CDFContextLog);
  fn symbol_with_update_4(&mut self, s: u32, cdf: &mut [u16; 4], log: &mut CDFContextLog);
```
Using a hybrid interface of slices and specific array sizes reduced encoding time by **1.1%**.[^pr2673]

## Final thoughts

There are still opportunities to speed-up further. We are not currently using any CDF update assembly from dav1d but after these changes our CDF layouts are compatible. There are more experiments to be done with estimating bit-rate and determining whether a precise greedy approach is actually optimal.

This is a story of open source community shining. All of this was done in 18 days, from filing the bug to squeezing out the last bit of speed-up. Along the way there was discussion, exploration, implementation, testing, benchmarking and an [alpha release](https://github.com/xiph/rav1e/releases/tag/v0.5.0-alpha). Various people contributed in different aspects of this fantastic outcome. Thank you, rav1e team!


[^pr2659]: PR 2659 [Add missing macro calls for symbol_with_update](https://github.com/xiph/rav1e/pull/2659)
[^pr2661]: PR 2661 [Add a log struct for CDFContext rollback](https://github.com/xiph/rav1e/pull/2661)
[^pr2663]: PR 2663 [Shrink CDFs by merging counter to final symbol position](https://github.com/xiph/rav1e/pull/2663)
[^pr2664]: PR 2664 [Partition CDF log by size](https://github.com/xiph/rav1e/pull/2664)
[^pr2666]: PR 2666 [Reduce size of BlockContextCheckpoint](https://github.com/xiph/rav1e/pull/2666)
[^pr2667]: PR 2667 [Use explicit table lookup for ac_q and dc_q](https://github.com/xiph/rav1e/pull/2667)
[^pr2671]: PR 2671 [Tune flow of inline methods in symbol_with_update](https://github.com/xiph/rav1e/pull/2671)
[^pr2673]: PR 2673 [Refactor CDF access so that size is always statically known](https://github.com/xiph/rav1e/pull/2673)
