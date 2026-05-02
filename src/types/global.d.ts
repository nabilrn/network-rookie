// Type declarations for external libraries loaded via CDN
declare global {
  interface Window {
    topojson: {
      feature: (topology: any, object: any) => any;
    };
  }
}

export {};
