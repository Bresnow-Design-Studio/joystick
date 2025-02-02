import throwFrameworkError from "../utils/throwFrameworkError";

const allowed = {
  events: [
    "readystatechange",
    "pointerlockchange",
    "pointerlockerror",
    "beforecopy",
    "beforecut",
    "beforepaste",
    "freeze",
    "resume",
    "search",
    "securitypolicyviolation",
    "visibilitychange",
    "fullscreenchange",
    "fullscreenerror",
    "webkitfullscreenchange",
    "webkitfullscreenerror",
    "beforexrselect",
    "abort",
    "blur",
    "cancel",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "close",
    "contextmenu",
    "cuechange",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "emptied",
    "ended",
    "error",
    "focus",
    "formdata",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "load",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "mousewheel",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "reset",
    "resize",
    "scroll",
    "seeked",
    "seeking",
    "select",
    "stalled",
    "submit",
    "suspend",
    "timeupdate",
    "toggle",
    "volumechange",
    "waiting",
    "webkitanimationend",
    "webkitanimationiteration",
    "webkitanimationstart",
    "webkittransitionend",
    "wheel",
    "auxclick",
    "gotpointercapture",
    "lostpointercapture",
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "pointerover",
    "pointerout",
    "pointerenter",
    "pointerleave",
    "selectstart",
    "selectionchange",
    "animationend",
    "animationiteration",
    "animationstart",
    "transitionrun",
    "transitionstart",
    "transitionend",
    "transitioncancel",
    "copy",
    "cut",
    "paste",
    "pointerrawupdate",
  ],
  lifecycle: ["onBeforeMount", "onMount", "onUpdateProps", "onBeforeUnmount"],
  options: [
    // NOTE: Internal methods passed automatically via Joystick during SSR.
    "_ssrId",
    "dataFromSSR",
    "api",
    "req",
    // NOTE: User-defined or standard methods.
    "id",
    "wrapper",
    "name",
    "props",
    "defaultProps",
    "state",
    "data",
    "lifecycle",
    "methods",
    "events",
    "css",
    "render",
    "url",
    "translations",
    "existingProps",
    "existingState"
  ],
};

const required = {
  options: ["render"],
};

const optionValueValidators = {
  name: (value) => {
    if (typeof value !== "string") {
      throwFrameworkError("options.name must be a string.");
    }
  },
  wrapper: (value) => {
    if (!(value instanceof Object)) {
      throwFrameworkError("options.wrapper must be an object.");
    }

    for (const [methodKey, methodValue] of Object.entries(value)) {
      if (methodKey === 'id' && typeof methodValue !== "string") {
        throwFrameworkError(
          `options.wrapper.${methodKey} must be assigned a string.`
        );
      }

      if (methodKey === 'classList' && !Array.isArray(methodValue)) {
        throwFrameworkError(
          `options.wrapper.${methodKey} must be assigned an array of strings.`
        );
      }
    }
  },
  lifecycle: (value) => {
    if (!(value instanceof Object)) {
      throwFrameworkError("options.lifecycle must be an object.");
    }

    for (const [lifecycleKey, lifecycleValue] of Object.entries(value)) {
      if (!allowed.lifecycle.includes(lifecycleKey)) {
        throwFrameworkError(
          `options.lifecycle.${lifecycleKey} is not supported.`
        );
      }

      if (typeof lifecycleValue !== "function") {
        throwFrameworkError(
          `options.lifecycle.${lifecycleKey} must be assigned a function.`
        );
      }
    }
  },
  methods: (value) => {
    if (!(value instanceof Object)) {
      throwFrameworkError("options.methods must be an object.");
    }

    for (const [methodKey, methodValue] of Object.entries(value)) {
      if (typeof methodValue !== "function") {
        throwFrameworkError(
          `options.methods.${methodKey} must be assigned a function.`
        );
      }
    }
  },
  events: (value) => {
    if (!(value instanceof Object)) {
      throwFrameworkError("options.events must be an object.");
    }

    for (const eventKey of Object.keys(value)) {
      const [eventType] = eventKey.split(" ");
      if (!allowed.events.includes(eventType)) {
        throwFrameworkError(
          `${eventType} is not a supported JavaScript event type.`
        );
      }
    }

    for (const [eventKey, eventValue] of Object.entries(value)) {
      if (typeof eventValue !== "function") {
        throwFrameworkError(
          `options.events.${eventKey} must be assigned a function.`
        );
      }
    }
  },
  css: (value) => {
    if (typeof value !== "string" && typeof value !== "function") {
      throwFrameworkError(
        "options.css must be a string or function returning a string."
      );
    }
  },
  render: (value) => {
    if (typeof value !== "function") {
      throwFrameworkError(
        "options.render must be a function returning a string."
      );
    }
  },
};

export default (options = {}) => {
  if (
    !required.options.every((requiredOption) =>
      Object.keys(options).includes(requiredOption)
    )
  ) {
    throwFrameworkError(
      `component options must include ${required.options.join(",")}.`
    );
  }

  for (const [optionKey, optionValue] of Object.entries(options)) {
    if (!allowed.options.includes(optionKey)) {
      throwFrameworkError(
        `${optionKey} is not supported by joystick.component.`
      );
    }

    const optionValueValidator = optionValueValidators[optionKey];

    if (optionValueValidator && typeof optionValueValidator === "function") {
      optionValueValidator(optionValue);
    }
  }
};
