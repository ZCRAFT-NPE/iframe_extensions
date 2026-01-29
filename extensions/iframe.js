// Name: Iframe - CCW Compatible Version
// ID: iframe_ccv
// Description: Display webpages or HTML over the stage.
// License: MIT AND MPL-2.0
// Original work by Turbowarp(GarboMuffin[https://github.com/GarboMuffin] & bambus80[https://github.com/bambus80]). CCW compatibility modifications by ZCRAFT-NPE.
// See LICENSE-MIT and LICENSE-MPL-2.0 for full texts, or visit:
//- MIT: https://opensource.org/licenses/MIT
//- MPL-2.0: https://www.mozilla.org/en-US/MPL/2.0/
Scratch.translate.setup({
  "zh-cn": {
    "_Iframe - CCW Compatible Version": "内嵌框架",
    "_It works!": "能用！",
    "_close iframe": "退出内嵌框架",
    "_height": "高度",
    "_hide iframe": "隐藏内嵌框架",
    "_iframe [MENU]": "内嵌框架的[MENU]",
    "_iframe message": "内嵌框架消息",
    "_interactive": "交互性",
    "_resize behavior": "调整大小行为",
    "_scale": "规模",
    "_send message [MESSAGE] to iframe": "向内嵌框架发送消息[MESSAGE]",
    "_set iframe height to [HEIGHT]": "将内嵌框架的高度设为[HEIGHT]",
    "_set iframe interactive to [INTERACTIVE]": "将内嵌框架的交互性设为[INTERACTIVE]",
    "_set iframe resize behavior to [RESIZE]": "将内嵌框架的调整大小行为设为[RESIZE]",
    "_set iframe width to [WIDTH]": "将内嵌框架的宽度设为[WIDTH]",
    "_set iframe x position to [X]": "将内嵌框架的x坐标设为[X]",
    "_set iframe y position to [Y]": "将内嵌框架的y坐标设为[Y]",
    "_show HTML [HTML]": "显示来自文本[HTML]的网页",
    "_show iframe": "显示内嵌框架",
    "_show website [URL]": "显示来自URL[URL]的网页",
    "_url": "URL",
    "_viewport": "视点",
    "_visible": "显示状态",
    "_when message received from iframe": "当从内嵌框架收到消息时",
    "_width": "宽度"
  }
});

(function (Scratch) {
  "use strict";
  
  const Cast = {
    toString: (v) => (v === undefined || v === null ? "" : String(v)),
    toNumber: (v) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    },
    toBoolean: (v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v.toLowerCase() === "true";
      return Boolean(v);
    },
  };

  const checkCanEmbed = async (url) => {
    if (Scratch.canEmbed && typeof Scratch.canEmbed === "function") {
      try {
        return await Scratch.canEmbed(url);
      } catch (e) {
        return true;
      }
    }
    return true;
  };

  const getRuntime = () => {
    if (typeof Scratch !== "undefined" && Scratch.vm && Scratch.vm.runtime) {
      return Scratch.vm.runtime;
    }
    if (typeof runtime !== "undefined") return runtime;
    return null;
  };

  const runtime = getRuntime();

  let stageObserver = null;
  let resizeListener = null;
  
  const findStageContainer = () => {
    const selectors = [
      '.gandi-stage',             
      '.stage-wrapper',         
      '[class*="stage_stage"]',    
      '[data-testid="stage"]',  
      'canvas.stage',            
      '.project-pane .stage',     
      '#app .stage',              
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    

    const canvas = document.querySelector('canvas');
    if (canvas) {
     
      let parent = canvas.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        const rect = parent.getBoundingClientRect();
      
        if (rect.width > 300 && rect.height > 200) {
          return parent;
        }
        parent = parent.parentElement;
      }

      return canvas.parentElement;
    }
    
    return null;
  };

  
  let iframe = null;
  let overlay = null;
  let stageContainer = null;

  const featurePolicy = {
    accelerometer: "'none'",
    "ambient-light-sensor": "'none'",
    battery: "'none'",
    camera: "'none'",
    "display-capture": "'none'",
    "document-domain": "'none'",
    "encrypted-media": "'none'",
    fullscreen: "'none'",
    geolocation: "'none'",
    gyroscope: "'none'",
    magnetometer: "'none'",
    microphone: "'none'",
    midi: "'none'",
    payment: "'none'",
    "picture-in-picture": "'none'",
    "publickey-credentials-get": "'none'",
    "speaker-selection": "'none'",
    usb: "'none'",
    vibrate: "'none'",
    vr: "'none'",
    "screen-wake-lock": "'none'",
    "web-share": "'none'",
    "interest-cohort": "'none'",
  };

  const SANDBOX = [
    "allow-same-origin",
    "allow-scripts",
    "allow-forms",
    "allow-modals",
    "allow-popups",
  ];

  let x = 0;
  let y = 0;
  let width = -1;
  let height = -1;
  let interactive = true;
  let resizeBehavior = "scale";
  let latestMessage = "";

 
  const getStageScale = () => {
    if (!stageContainer) return 1;
    const rect = stageContainer.getBoundingClientRect();
    const stageWidth = runtime ? runtime.stageWidth || 480 : 480;
  
    return rect.width / stageWidth;
  };

  const updateFrameAttributes = () => {
    if (!iframe) return;

    iframe.style.pointerEvents = interactive ? "auto" : "none";

    if (!runtime) return;

    const stageWidth = runtime.stageWidth || 480;
    const stageHeight = runtime.stageHeight || 360;
    const effectiveWidth = width >= 0 ? width : stageWidth;
    const effectiveHeight = height >= 0 ? height : stageHeight;

    if (resizeBehavior === "scale") {
      if (overlay) {
    
        iframe.style.width = `${effectiveWidth}px`;
        iframe.style.height = `${effectiveHeight}px`;
        iframe.style.transform = `translate(${-effectiveWidth / 2 + x}px, ${
          -effectiveHeight / 2 - y
        }px)`;
        iframe.style.top = "0";
        iframe.style.left = "0";
      } else if (stageContainer) {
      
        const containerRect = stageContainer.getBoundingClientRect();
        
        const containerRatio = containerRect.width / containerRect.height;
        const stageRatio = stageWidth / stageHeight;
        
        let displayWidth = containerRect.width;
        let displayHeight = containerRect.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (containerRatio > stageRatio) {
         
          displayWidth = containerRect.height * stageRatio;
          offsetX = (containerRect.width - displayWidth) / 2;
        } else {
       
          displayHeight = containerRect.width / stageRatio;
          offsetY = (containerRect.height - displayHeight) / 2;
        }
        
        const scale = displayWidth / stageWidth;
     
        const pixelX = offsetX + (displayWidth / 2) + (x * scale) - (effectiveWidth * scale / 2);
        const pixelY = offsetY + (displayHeight / 2) - (y * scale) - (effectiveHeight * scale / 2);
        
        iframe.style.width = `${effectiveWidth * scale}px`;
        iframe.style.height = `${effectiveHeight * scale}px`;
        iframe.style.left = `${pixelX}px`;
        iframe.style.top = `${pixelY}px`;
        iframe.style.transform = 'none';
        iframe.style.position = 'absolute';
      } else {
  
        iframe.style.width = `${effectiveWidth}px`;
        iframe.style.height = `${effectiveHeight}px`;
        iframe.style.left = `50%`;
        iframe.style.top = `50%`;
        iframe.style.transform = `translate(calc(-50% + ${x}px), calc(-50% - ${y}px))`;
        iframe.style.position = 'fixed';
      }
    } else {

      iframe.style.width = `${(effectiveWidth / stageWidth) * 100}%`;
      iframe.style.height = `${(effectiveHeight / stageHeight) * 100}%`;
      iframe.style.transform = "";
      iframe.style.top = `${
        (0.5 - effectiveHeight / 2 / stageHeight - y / stageHeight) * 100
      }%`;
      iframe.style.left = `${
        (0.5 - effectiveWidth / 2 / stageWidth + x / stageWidth) * 100
      }%`;
    }
  };

  const getOverlayMode = () =>
    resizeBehavior === "scale" ? "scale-centered" : "manual";

  const createFrame = (src) => {

    closeFrame();
    

    iframe = document.createElement("iframe");
    iframe.style.border = "none";
    iframe.style.position = "absolute";
    iframe.style.zIndex = "9999"; 
    iframe.setAttribute("sandbox", SANDBOX.join(" "));
    iframe.setAttribute(
      "allow",
      Object.entries(featurePolicy)
        .map(([name, permission]) => `${name} ${permission}`)
        .join("; ")
    );
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("src", src);

 
    if (Scratch.renderer && typeof Scratch.renderer.addOverlay === 'function') {
      try {
        overlay = Scratch.renderer.addOverlay(iframe, getOverlayMode());
        updateFrameAttributes();
        return;
      } catch (e) {
        console.warn("addOverlay 失败，回退到 DOM 模式", e);
      }
    }


    stageContainer = findStageContainer();
    
    if (stageContainer) {
      console.log("Iframe 扩展：已附加到舞台容器", stageContainer);

      const computedStyle = window.getComputedStyle(stageContainer);
      if (computedStyle.position === 'static') {
        stageContainer.style.position = 'relative';
      }
      
      stageContainer.appendChild(iframe);
      
 
      updateFrameAttributes();
      

      if (window.ResizeObserver) {
        stageObserver = new ResizeObserver((entries) => {
 
          requestAnimationFrame(updateFrameAttributes);
        });
        stageObserver.observe(stageContainer);
      }
      
 
      resizeListener = () => requestAnimationFrame(updateFrameAttributes);
      window.addEventListener('resize', resizeListener);
      
    } else {
      console.warn("Iframe 扩展：未找到舞台容器，将使用固定定位");
      document.body.appendChild(iframe);
      iframe.style.position = 'fixed';
      updateFrameAttributes();
    }
  };

  const closeFrame = () => {
   
    if (stageObserver) {
      stageObserver.disconnect();
      stageObserver = null;
    }
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener);
      resizeListener = null;
    }
    
    if (iframe) {
      if (overlay && Scratch.renderer && typeof Scratch.renderer.removeOverlay === 'function') {
        try {
          Scratch.renderer.removeOverlay(iframe);
        } catch (e) {}
      } else if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      iframe = null;
      overlay = null;
      stageContainer = null;
    }
  };


  if (typeof window !== 'undefined') {
    window.addEventListener("message", (e) => {
      if (iframe && iframe.contentWindow && e.source === iframe.contentWindow) {
        latestMessage =
          typeof e.data === "string" ||
          typeof e.data === "number" ||
          typeof e.data === "boolean"
            ? e.data
            : JSON.stringify(e.data);
        if (runtime && typeof runtime.startHats === 'function') {
          runtime.startHats("iframe_whenMessage");
        }
      }
    });
  }


  if (runtime) {
    const handleStageChange = () => {
      
      if (!overlay && iframe) {
        requestAnimationFrame(updateFrameAttributes);
      }
    };
    
    if (typeof runtime.on === 'function') {
      runtime.on("STAGE_SIZE_CHANGED", handleStageChange);
      runtime.on("RUNTIME_DISPOSED", closeFrame);
    } else if (Scratch.vm && typeof Scratch.vm.on === 'function') {
      Scratch.vm.on("STAGE_SIZE_CHANGED", handleStageChange);
      Scratch.vm.on("RUNTIME_DISPOSED", closeFrame);
    }
  }

  class IframeExtension {
    getInfo() {
  return {
    name: Scratch.translate("Iframe - CCW Compatible Version"),
    id: "iframe_ccv",
    blocks: [
      {
        opcode: "display",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("show website [URL]"),
        arguments: {
          URL: {
            type: Scratch.ArgumentType.STRING,
            defaultValue: "https://www.example.com",
          },
        },
      },
      {
        opcode: "displayHTML",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("show HTML [HTML]"),
        arguments: {
          HTML: {
            type: Scratch.ArgumentType.STRING,
            defaultValue: `<h1>${Scratch.translate("It works!")}</h1>`,
          },
        },
      },
      "---",
      {
        opcode: "show",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("show iframe"),
      },
      {
        opcode: "hide",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("hide iframe"),
      },
      {
        opcode: "close",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("close iframe"),
      },
      "---",
      {
        opcode: "get",
        blockType: Scratch.BlockType.REPORTER,
        text: Scratch.translate("iframe [MENU]"),
        arguments: {
          MENU: {
            type: Scratch.ArgumentType.STRING,
            menu: "getMenu",
          },
        },
      },
      {
        opcode: "setX",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe x position to [X]"),
        arguments: {
          X: {
            type: Scratch.ArgumentType.NUMBER,
            defaultValue: "0",
          },
        },
      },
      {
        opcode: "setY",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe y position to [Y]"),
        arguments: {
          Y: {
            type: Scratch.ArgumentType.NUMBER,
            defaultValue: "0",
          },
        },
      },
      {
        opcode: "setWidth",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe width to [WIDTH]"),
        arguments: {
          WIDTH: {
            type: Scratch.ArgumentType.NUMBER,
            defaultValue: runtime ? runtime.stageWidth || 480 : 480,
          },
        },
      },
      {
        opcode: "setHeight",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe height to [HEIGHT]"),
        arguments: {
          HEIGHT: {
            type: Scratch.ArgumentType.NUMBER,
            defaultValue: runtime ? runtime.stageHeight || 360 : 360,
          },
        },
      },
      {
        opcode: "setInteractive",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe interactive to [INTERACTIVE]"),
        arguments: {
          INTERACTIVE: {
            type: Scratch.ArgumentType.STRING,
            menu: "interactiveMenu",
          },
        },
      },
      {
        opcode: "setResize",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("set iframe resize behavior to [RESIZE]"),
        arguments: {
          RESIZE: {
            type: Scratch.ArgumentType.STRING,
            menu: "resizeMenu",
          },
        },
      },
      "---",
      {
        opcode: "sendMessage",
        blockType: Scratch.BlockType.COMMAND,
        text: Scratch.translate("send message [MESSAGE] to iframe"),
        arguments: {
          MESSAGE: {
            type: Scratch.ArgumentType.STRING,
            defaultValue: "hello",
          },
        },
      },
      {
        opcode: "whenMessage",
        blockType: Scratch.BlockType.EVENT,
        text: Scratch.translate("when message received from iframe"),
        isEdgeActivated: false,
      },
      {
        opcode: "iframeMessage",
        blockType: Scratch.BlockType.REPORTER,
        text: Scratch.translate("iframe message"),
      },
    ],
    menus: {
      getMenu: {
        acceptReporters: true,
        items: [
          Scratch.translate("url"),
          Scratch.translate("visible"),
          "x",
          "y",
          Scratch.translate("width"),
          Scratch.translate("height"),
          Scratch.translate("interactive"),
          Scratch.translate("resize behavior"),
        ],
      },
      interactiveMenu: {
        acceptReporters: true,
        items: ["true", "false"],
      },
      resizeMenu: {
        acceptReporters: true,
        items: [
          {
            text: Scratch.translate("scale"),
            value: "scale",
          },
          {
            text: Scratch.translate("viewport"),
            value: "viewport",
          },
        ],
      },
    },
  };
}

    async display({ URL }) {
      closeFrame();
      const urlString = Cast.toString(URL);
      if (await checkCanEmbed(urlString)) {
        createFrame(urlString);
      }
    }

    async displayHTML({ HTML }) {
      closeFrame();
      const htmlContent = Cast.toString(HTML);
      const url = `data:text/html;,${encodeURIComponent(htmlContent)}`;
      if (await checkCanEmbed(url)) {
        createFrame(url);
      }
    }

    show() {
      if (iframe) {
        iframe.style.display = "";
        updateFrameAttributes(); 
      }
    }

    hide() {
      if (iframe) {
        iframe.style.display = "none";
      }
    }

    close() {
      closeFrame();
    }

    get({ MENU }) {
      const menuStr = Cast.toString(MENU);
      if (menuStr === "url") {
        return iframe ? (iframe.getAttribute("src") || "") : "";
      } else if (menuStr === "visible") {
        return !!iframe && iframe.style.display !== "none";
      } else if (menuStr === "x") {
        return x;
      } else if (menuStr === "y") {
        return y;
      } else if (menuStr === "width") {
        return width >= 0 ? width : (runtime ? runtime.stageWidth || 480 : 480);
      } else if (menuStr === "height") {
        return height >= 0 ? height : (runtime ? runtime.stageHeight || 360 : 360);
      } else if (menuStr === "interactive") {
        return interactive;
      } else if (menuStr === "resize behavior") {
        return resizeBehavior;
      }
      return "";
    }

    setX({ X }) {
      x = Cast.toNumber(X);
      updateFrameAttributes();
    }

    setY({ Y }) {
      y = Cast.toNumber(Y);
      updateFrameAttributes();
    }

    setWidth({ WIDTH }) {
      width = Cast.toNumber(WIDTH);
      updateFrameAttributes();
    }

    setHeight({ HEIGHT }) {
      height = Cast.toNumber(HEIGHT);
      updateFrameAttributes();
    }

    setInteractive({ INTERACTIVE }) {
      interactive = Cast.toBoolean(INTERACTIVE);
      updateFrameAttributes();
    }

    setResize({ RESIZE }) {
      if (RESIZE === "scale" || RESIZE === "viewport") {
        resizeBehavior = RESIZE;
        if (overlay && Scratch.renderer && typeof Scratch.renderer._updateOverlays === 'function') {
          try {
            overlay.mode = getOverlayMode();
            Scratch.renderer._updateOverlays();
          } catch (e) {}
        }
        updateFrameAttributes();
      }
    }

    sendMessage({ MESSAGE }) {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(MESSAGE, "*");
      }
    }

    iframeMessage() {
      return latestMessage;
    }
  }

  if (typeof Scratch !== 'undefined' && Scratch.extensions) {
    Scratch.extensions.register(new IframeExtension());
  }
})(Scratch);
