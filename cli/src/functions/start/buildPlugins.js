import fs from "fs";
import chalk from 'chalk';
import updateFileMap from "./updateFileMap.js";
import { JOYSTICK_UI_REGEX, EXPORT_DEFAULT_REGEX } from "../../lib/regexes.js";
import generateId from "./generateId.js";
import getPlatformSafePath from '../../lib/getPlatformSafePath.js';

export default {
  bootstrapComponent: {
    name: "bootstrapComponent",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, (args = {}) => {
        try {
          const shouldSetSSRId = [getPlatformSafePath("ui/")].some((bootstrapTarget) => {
            return args.path.includes(bootstrapTarget);
          });
          const isLayoutComponent = [getPlatformSafePath("ui/layouts")].some((bootstrapTarget) => {
            return args.path.includes(bootstrapTarget);
          });
          const isPageComponent = [getPlatformSafePath("ui/pages")].some((bootstrapTarget) => {
            return args.path.includes(bootstrapTarget);
          });
  
          if (shouldSetSSRId || isLayoutComponent || isPageComponent) {
            const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");

            // NOTE: Check to see if we have a valid component file.
            const joystickUIMatches = code.match(JOYSTICK_UI_REGEX) || [];
            const joystickUIMatch = joystickUIMatches && joystickUIMatches[0];
            const exportDefaultMatches = code.match(EXPORT_DEFAULT_REGEX) || [];
            const exportDefaultMatch = exportDefaultMatches && exportDefaultMatches[0];

            if (joystickUIMatch && !exportDefaultMatch) {
              console.log(" ");
              console.warn(
                chalk.yellowBright(
                  `All Joystick components in the ui directory must have an export default statement (e.g., export default MyComponent, export default MyLayout, or export default MyPage). Please check the file at ${args.path}.`
                )
              );
              console.log(" ");
              return;
            }

            // NOTE: Generate SSR ID and then replace the necessary markup. Make contents a let so we can perform
            // additional modifications below.
            const ssrId = generateId();
            let contents = code.replace('ui.component({', `ui.component({\n  _ssrId: '${ssrId}',`);

            const exportDefaultMatchParts = (exportDefaultMatch && exportDefaultMatch.split(" ")) || [];
            const componentName = exportDefaultMatchParts.pop();

            if (componentName && isLayoutComponent) {
              contents = contents.replace(
                `${exportDefaultMatch};`,
                `if (
                  typeof window !== 'undefined' &&
                  window.__joystick_ssr__ === true &&
                  window.__joystick_layout_page__ &&
                  ui &&
                  ui.mount
                ) {
                  (async () => {
                    const layoutComponentFile = await import(window.__joystick_layout__);
                    const pageComponentFile = await import(window.window.__joystick_layout_page_url__);
                    const layout = layoutComponentFile.default;
                    const page = pageComponentFile.default;
                    ui.mount(layout, Object.assign({ ...window.__joystick_ssr_props__ }, { page }), document.getElementById('app'));
                  })();
                }
              
              export default ${componentName};
                `
              )
            }

            if (componentName && isPageComponent) {
              contents = contents.replace(
                `${exportDefaultMatch};`,
                `if (
                  typeof window !== 'undefined' &&
                  window.__joystick_ssr__ === true &&
                  !window.__joystick_layout_page__ &&
                  ui &&
                  ui.mount
                ) {
                  ui.mount(${componentName}, window.__joystick_ssr_props__ || {}, document.getElementById('app'));
                }
                
                export default ${componentName};
                `
              )
            }

            return {
              contents,
              loader: 'js',
            };
          }
        } catch (exception) {
          console.warn(exception);
        }
      });
    }
  },
  bootstrapLayoutComponent: {
    name: "bootstrapLayoutComponent",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, (args) => {
        try {
          const shouldBootstrap = [getPlatformSafePath("ui/layouts")].some((bootstrapTarget) => {
            return args.path.includes(bootstrapTarget);
          });
  
          if (shouldBootstrap) {
            const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
            const joystickUIMatches = code.match(JOYSTICK_UI_REGEX) || [];
            const joystickUIMatch = joystickUIMatches && joystickUIMatches[0];
            const exportDefaultMatches = code.match(EXPORT_DEFAULT_REGEX) || [];
            const exportDefaultMatch = exportDefaultMatches && exportDefaultMatches[0];
            
  
            if (joystickUIMatch && !exportDefaultMatch) {
              console.log(" ");
              console.warn(
                chalk.yellowBright(
                  `All Joystick components in the ui/layouts directory must have an export default statement (e.g., export default MyLayout). Please check the file at ${args.path}.`
                )
              );
              console.log(" ");
              return;
            }
  
            const matchParts = (exportDefaultMatch && exportDefaultMatch.split(" ")) || [];
            const componentName = matchParts.pop();
  
            if (componentName) {
              const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
  
              return {
                contents: code.replace(
                  `${exportDefaultMatch};`,
                  `if (
                    typeof window !== 'undefined' &&
                    window.__joystick_ssr__ === true &&
                    window.__joystick_layout_page__ &&
                    ui &&
                    ui.mount
                  ) {
                    (async () => {
                      const layoutComponentFile = await import(window.__joystick_layout__);
                      const pageComponentFile = await import(window.window.__joystick_layout_page_url__);
                      const layout = layoutComponentFile.default;
                      const page = pageComponentFile.default;
                      ui.mount(layout, Object.assign({ ...window.__joystick_ssr_props__ }, { page }), document.getElementById('app'));
                    })();
                  }
                
                export default ${componentName};
                  `
                ),
                loader: "js",
              };
            }
          }
        } catch (exception) {
          console.warn(exception);
        }
      });
    },
  },
  bootstrapPageComponent: {
    name: "bootstrapPageComponent",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, (args) => {
        try {
          const shouldBootstrap = [getPlatformSafePath("ui/pages")].some((bootstrapTarget) => {
            return args.path.includes(bootstrapTarget);
          });
  
          if (shouldBootstrap) {
            const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
            const joystickUIMatches = code.match(JOYSTICK_UI_REGEX) || [];
            const joystickUIMatch = joystickUIMatches && joystickUIMatches[0];
            const exportDefaultMatches = code.match(EXPORT_DEFAULT_REGEX) || [];
            const exportDefaultMatch = exportDefaultMatches && exportDefaultMatches[0];
  
            if (joystickUIMatch && !exportDefaultMatch) {
              console.log(" ");
              console.warn(
                chalk.yellowBright(
                  `All Joystick components in the ui/pages directory must have an export default statement (e.g., export default MyPage). Please check the file at ${args.path}.`
                )
              );
              console.log(" ");
              return;
            }
  
            const matchParts = (exportDefaultMatch && exportDefaultMatch.split(" ")) || [];
            const componentName = matchParts.pop();
  
            if (componentName) {
              const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
  
              return {
                contents: code.replace(
                  `${exportDefaultMatch};`,
                  `if (
                    typeof window !== 'undefined' &&
                    window.__joystick_ssr__ === true &&
                    !window.__joystick_layout_page__ &&
                    ui &&
                    ui.mount
                  ) {
                    ui.mount(${componentName}, window.__joystick_ssr_props__ || {}, document.getElementById('app'));
                  }
                  
                  export default ${componentName};
                  `
                ),
                loader: "js",
              };
            }
          }
        } catch (exception) {
          console.warn(exception);
        }
      });
    },
  },
  generateFileDependencyMap: {
    name: "generateFileDependencyMap",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, (args) => {
        try {
          const canAddToMap = ![
            "node_modules",
            ".joystick",
            "?",
            "commonjsHelpers.js",
          ].some((excludedPath) => {
            return getPlatformSafePath(args.path).includes(excludedPath);
          });

          if (canAddToMap) {
            const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
            updateFileMap(getPlatformSafePath(args.path), code);
          }
        } catch (exception) {
          console.warn(exception);
        }
      });
    },
  },
  ssrId: {
    name: "ssrId",
    setup(build) {
      /*
        TODO:

        ESBuild reuses classes for efficiency. This means that the below doesn't work if we're setting the ssrId on the
        Joystick component class instance. Due to class reuse, any components rendered using the component() render function
        end up reusing their parent's ui.component() class. This means that they accidentally inherit the parent's ssrId
        because ESBuild only keeps the parent class instances (the first one) and drops the other (along with the unique
        ssrId for the child).

        Goal: Either prevent this from happening, or, relocate setting of ssrId to a location that won't be affected by
        the build trying to reduce code.
      */

      build.onLoad({ filter: /\.js$/ }, (args) => {
        const shouldSetId = [getPlatformSafePath("ui/")].some((bootstrapTarget) => {
          return args.path.includes(bootstrapTarget);
        });

        if (shouldSetId) {
          const code = fs.readFileSync(getPlatformSafePath(args.path), "utf-8");
          const ssrId = generateId();
          const contents = code.replace('ui.component({', `ui.component({\n  _ssrId: '${ssrId}',`);

          return {
            contents,
            loader: "js",
          };
        }
      });
    }
  },
};