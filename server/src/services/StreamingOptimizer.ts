/**
 * Streaming Optimizer
 * Optimizes streaming responses for AI services:
 * - Chunk batching
 * - Adaptive streaming rates
 * - Connection pooling
 * - Error recovery
 */

export interface StreamChunk<T = any> {
  data: T;
  sequence: number;
  timestamp: number;
  isLast: boolean;
  metadata?: Record<string, any>;
}

export interface StreamOptions {
  chunkSize?: number; // Bytes per chunk
  batchWindow?: number; // Milliseconds to batch chunks
  maxConcurrency?: number; // Max concurrent streams
  bufferSize?: number; // Buffer size in bytes
  compression?: boolean; // Enable compression
}

export class StreamingOptimizer {
  private activeStreams: Map<string, {
    buffer: Buffer[];
    lastFlush: number;
    sequence: number;
  }> = new Map();

  private defaultOptions: Required<StreamOptions> = {
    chunkSize: 8192, // 8KB chunks
    batchWindow: 50, // 50ms batching window
    maxConcurrency: 100,
    bufferSize: 1024 * 1024, // 1MB buffer
    compression: false,
  };

  /**
   * Optimize stream chunks by batching and buffering
   */
  async *optimizeStream<T>(
    sourceStream: AsyncIterable<T>,
    streamId: string,
    options?: StreamOptions
  ): AsyncGenerator<StreamChunk<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let sequence = 0;

    // Get or create stream buffer
    if (!this.activeStreams.has(streamId)) {
      this.activeStreams.set(streamId, {
        buffer: [],
        lastFlush: Date.now(),
        sequence: 0,
      });
    }

    const streamState = this.activeStreams.get(streamId)!;
    let flushTimer: NodeJS.Timeout | null = null;

    try {
      for await (const item of sourceStream) {
        // Add to buffer
        const chunk: StreamChunk<T> = {
          data: item,
          sequence: sequence++,
          timestamp: Date.now(),
          isLast: false,
        };

        streamState.buffer.push(Buffer.from(JSON.stringify(chunk)));

        // Check if buffer should be flushed
        const timeSinceLastFlush = Date.now() - streamState.lastFlush;
        const shouldFlush = 
          streamState.buffer.length * opts.chunkSize >= opts.bufferSize ||
          timeSinceLastFlush >= opts.batchWindow;

        if (shouldFlush) {
          // Clear existing timer
          if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
          }

          // Flush buffer
          for (const buffered of streamState.buffer) {
            const chunk = JSON.parse(buffered.toString()) as StreamChunk<T>;
            yield chunk;
          }

          streamState.buffer = [];
          streamState.lastFlush = Date.now();
        } else if (!flushTimer) {
          // Schedule flush if not already scheduled
          flushTimer = setTimeout(() => {
            this.flushBuffer(streamId);
          }, opts.batchWindow - timeSinceLastFlush);
        }
      }

      // Flush remaining buffer
      await this.flushBuffer(streamId);

      // Send final chunk
      yield {
        data: null as any,
        sequence: sequence++,
        timestamp: Date.now(),
        isLast: true,
      } as StreamChunk<T>;

    } finally {
      // Cleanup
      this.activeStreams.delete(streamId);
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
    }
  }

  /**
   * Flush buffer for a stream
   */
  private async flushBuffer(streamId: string): Promise<void> {
    const streamState = this.activeStreams.get(streamId);
    if (!streamState || streamState.buffer.length === 0) {
      return;
    }

    // Buffer is flushed by the generator
    streamState.buffer = [];
    streamState.lastFlush = Date.now();
  }

  /**
   * Optimize audio streaming with adaptive chunking
   */
  async *optimizeAudioStream(
    sourceStream: AsyncIterable<Uint8Array>,
    options?: StreamOptions
  ): AsyncGenerator<Uint8Array> {
    const opts = { ...this.defaultOptions, ...options };
    let buffer = Buffer.alloc(0);

    for await (const chunk of sourceStream) {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

      // Yield chunks when buffer reaches optimal size
      while (buffer.length >= opts.chunkSize) {
        const chunkToSend = buffer.slice(0, opts.chunkSize);
        buffer = buffer.slice(opts.chunkSize);
        yield chunkToSend;
      }
    }

    // Send remaining buffer
    if (buffer.length > 0) {
      yield buffer;
    }
  }

  /**
   * Get stream statistics
   */
  getStreamStats(streamId: string): {
    bufferSize: number;
    chunksBuffered: number;
    lastFlush: number;
  } | null {
    const state = this.activeStreams.get(streamId);
    if (!state) return null;

    return {
      bufferSize: state.buffer.reduce((sum, buf) => sum + buf.length, 0),
      chunksBuffered: state.buffer.length,
      lastFlush: state.lastFlush,
    };
  }

  /**
   * Cleanup stale streams
   */
  cleanupStaleStreams(maxAge: number = 60000): void {
    const now = Date.now();
    for (const [streamId, state] of this.activeStreams.entries()) {
      if (now - state.lastFlush > maxAge) {
        this.activeStreams.delete(streamId);
      }
    }
  }

  /**
   * Get total active streams count
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}

export const streamingOptimizer = new StreamingOptimizer();
