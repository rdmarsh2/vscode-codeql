import * as webpack from 'webpack';
import { viewConfig, rendererConfig } from './webpack.config';

export function compileView(cb: (err?: Error) => void) {
  webpack(viewConfig).run((error, stats) => {
    if (error) {
      cb(error);
    }
    if (stats) {
      console.log(stats.toString({
        errorDetails: true,
        colors: true,
        assets: false,
        builtAt: false,
        version: false,
        hash: false,
        entrypoints: false,
        timings: false,
        modules: false,
        errors: true
      }));
      if (stats.hasErrors()) {
        cb(new Error('Compilation errors detected.'));
        return;
      }
    }

    cb();
  });
  webpack(rendererConfig).run((error, stats) => {
    if (error) {
      cb(error);
    }
    if (stats) {
      console.log(stats.toString({
        errorDetails: true,
        colors: true,
        assets: false,
        builtAt: false,
        version: false,
        hash: false,
        entrypoints: false,
        timings: false,
        modules: false,
        errors: true
      }));
      if (stats.hasErrors()) {
        cb(new Error('Compilation errors detected.'));
        return;
      }
    }

    cb();
  });
}
