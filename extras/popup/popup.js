chrome.storage.sync.get("theme", function (obj) {
  var theme = obj.theme

  if (theme == "light"){
    document.head.innerHTML += "<link rel='stylesheet' href='/extras/popup/light.css' id='themecss'>"
  }else if (theme == "dark"){
    document.head.innerHTML += "<link rel='stylesheet' href='/extras/popup/dark.css' id='themecss'>"
  }else{
    document.head.innerHTML += "<link rel='stylesheet' href='/extras/popup/light.css' id='themecss'>" // default theme
    console.error(console.log("ScratchTools:"), " Theme not found. Defaulting to light theme.")
  }
});

var version = chrome.runtime.getManifest().version_name;
if (version.includes("beta")) {
  document.head.innerHTML += "<link rel='stylesheet' href='/extras/popup/beta.css' id='betacss'>"
  if (document.head.id == "Popup") {
    document.getElementById('minilogo').src = "/extras/icons/mini-logo-beta.svg"
    document.getElementById('popupnote').innerHTML = "Welcome to the beta verison of ScratchTools! This version is not stable and may contain bugs. Please report any bugs you find <a href='https://github.com/STForScratch/ScratchTools/issues' target='_blank'>here</a>."
  }
}

document.getElementById("toggletheme").addEventListener("click", toggletheme);

function toggletheme(){
  var theme = document.getElementById("themecss")
  if (theme.href.includes("light")){
    theme.href = "/extras/popup/dark.css"
    chrome.storage.sync.set({ theme: "dark" })
  }else if (theme.href.includes("dark")){
    theme.href = "/extras/popup/light.css"
    chrome.storage.sync.set({ theme: "light" })
  }else{
    theme.href = "/extras/popup/light.css" // default theme
    console.error(console.log("ScratchTools:"), " Theme not found. Defaulting to light theme.")
  }
}

document.querySelector(".searchbar").placeholder =
  chrome.i18n.getMessage("search") || "search";

document.querySelector(".searchbar").addEventListener("input", function () {
  document.querySelectorAll(".feature").forEach(function (el) {
    if (
      (
        el.querySelector("h3").textContent.toLowerCase() +
        el.querySelector("p").textContent.toLowerCase() +
        el.querySelector("span").textContent.toLowerCase()
      ).includes(document.querySelector(".searchbar").value.toLowerCase())
    ) {
      el.style.display = null;
    } else {
      el.style.display = "none";
    }
  });
});

if (document.querySelector(".settingsButton")) {
  document
    .querySelector(".settingsButton")
    .addEventListener("click", async function () {
      chrome.tabs.create({
        url: "/extras/index.html",
      });
    });
} else {
  document.addEventListener("keydown", async function (e) {
    if (e.which === 70 && e.altKey) {
      var featuresData =
        (await chrome.storage.sync.get("features")).features || "";
      const data = await (
        await fetch("https://data.scratchtools.app/create/", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ features: featuresData }),
        })
      ).json();
      if (data.error) {
        ScratchTools.modals.create({
          title: "An error occurred",
          description: "We were unable to generate a code for your features. They could be corrupt, or the server had an issue."
        })
      } else {
        ScratchTools.modals.create({
          title: "Saved features",
          description: "We've converted your feature set into a short code that you can save or use when reporting bugs. You can copy it from below.",
          components: [{ type: "code", content: data.code }]
        })
      }
    }
  });
}

async function getFeatures() {
  const settings = (await chrome.storage.sync.get("features")).features || "";
  const data = await (await fetch("/features/features.json")).json();
  for (var featurePlace in data) {
    var feature = data[featurePlace];

    var div = document.createElement("div");
    div.className = "feature";

    feature.id = feature.id || feature.file;
    div.dataset.id = feature.id;

    if (feature.version === 2) {
      const featureData = await (
        await fetch("/features/" + feature.id + "/data.json")
      ).json();
      featureData.id = feature.id;
      featureData.version = feature.version;
      feature = featureData;
    }

    var h3 = document.createElement("h3");
    h3.textContent =
      chrome.i18n.getMessage(feature.id.replaceAll("-", "_") + "_title") ||
      feature.title;
    h3.className = "featureTitle";
    div.appendChild(h3);

    var label = document.createElement("label");
    label.className = "switch";
    var input = document.createElement("input");
    input.type = "checkbox";
    var span = document.createElement("span");
    span.className = "slider round";
    label.appendChild(input);
    label.appendChild(span);
    div.appendChild(label);
    if (settings.includes(feature.id)) {
      input.checked = true;
    }

    input.addEventListener("input", async function () {
      var data = (await chrome.storage.sync.get("features")).features || "";
      if (!data.includes(this.parentNode.parentNode.dataset.id)) {
        this.checked = true;
        await chrome.storage.sync.set({
          features: data + "." + this.parentNode.parentNode.dataset.id,
        });
        dynamicEnable(this.parentNode.parentNode.dataset.id);
      } else {
        this.checked = false;
        await chrome.storage.sync.set({
          features: data.replaceAll(this.parentNode.parentNode.dataset.id, ""),
        });
        dynamicDisable(this.parentNode.parentNode.dataset.id);
      }
    });

    var p = document.createElement("p");
    p.textContent =
      chrome.i18n.getMessage(
        feature.id.replaceAll("-", "_") + "_description"
      ) || feature.description;
    div.appendChild(p);

    if (feature.options) {
      for (var optionPlace in feature.options) {
        var option = feature.options[optionPlace];
        var input = document.createElement("input");
        input.dataset.id = option.id;
        input.placeholder = option.name;
        input.type = ["text", "checkbox", "number", "color"][option.type || 0];
        var optionData = (await chrome.storage.sync.get(option.id))[option.id];
        input.value = optionData || "";
        div.appendChild(input);
        input.addEventListener("input", async function () {
          var saveData = {};
          saveData[this.dataset.id] = this.value;
          await chrome.storage.sync.set(saveData);
        });
      }
    }

    var span = document.createElement("span");
    span.textContent =
      (chrome.i18n.getMessage("credits_text") || "Credits") + ": ";

    feature.credits.forEach(function (credit, i) {
      var a = document.createElement("a");
      if (feature.version === 2) {
        a.textContent = credit.username;
        if (document.querySelector(".main-page")) {
          a.href = credit.url;
        } else {
          a.onclick = function () {
            chrome.tabs.create({
              url: credit.url,
            });
          };
        }
      } else {
        a.textContent = credit;
        a.dataset.url = feature.urls[i];
        if (document.querySelector(".main-page")) {
          a.href = feature.urls[i];
        } else {
          a.onclick = function () {
            chrome.tabs.create({
              url: this.dataset.url,
            });
          };
        }
      }
      span.appendChild(a);
      if (i + 1 !== feature.credits.length) {
        var comma = document.createElement("span");
        comma.textContent = ", ";
        span.appendChild(comma);
      }
    });
    div.appendChild(span);

    document.querySelector(".settings").appendChild(div);
  }
}
getFeatures();

async function dynamicEnable(id) {
  var features = await (await fetch("/features/features.json")).json();
  features.forEach(async function (feature) {
    if (feature.file === id) {
      if (feature.dynamic) {
        chrome.tabs.query({}, function (tabs) {
          for (var i = 0; i < tabs.length; i++) {
            try {
              chrome.scripting.executeScript({
                target: { tabId: tabs[i].id },
                files: [`/features/${feature.file}.js`],
                world: "MAIN",
              });
            } catch (err) {}
          }
        });
      }
    } else if (feature.version === 2 && feature.id === id) {
      var featureData = await (
        await fetch(`/features/${feature.id}/data.json`)
      ).json();
      if (featureData.dynamic) {
        featureData.scripts?.forEach(function (el) {
          chrome.tabs.query({}, function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
              try {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[i].id },
                  files: [`/features/${feature.id}/${el}`],
                  world: "MAIN",
                });
              } catch (err) {}
            }
          });
        });
        featureData.styles?.forEach(function (style) {
          chrome.tabs.query({}, function (tabs) {
            for (var i = 0; i < tabs.length; i++) {
              chrome.scripting.executeScript({
                args: [
                  feature.id,
                  chrome.runtime.getURL(`/features/${feature.id}/${style}`),
                ],
                target: { tabId: tabs[i].id },
                func: insertCSS,
                world: "MAIN",
              });
              function insertCSS(feature, path) {
                var link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = path;
                link.dataset.feature = feature;
                document.head.appendChild(link);
              }
            }
          });
        });
      }
    }
  });
}

async function dynamicDisable(id) {
  var features = await (await fetch("/features/features.json")).json();
  features.forEach(async function (feature) {
    if (feature.file === id) {
      if (feature.dynamic) {
        chrome.tabs.query({}, function (tabs) {
          for (var i = 0; i < tabs.length; i++) {
            try {
              chrome.scripting.executeScript({
                args: [id],
                target: { tabId: tabs[i].id },
                func: disableFeature,
                world: "MAIN",
              });
              function disableFeature(f) {
                ScratchTools.disable(f);
              }
            } catch (err) {}
          }
        });
      }
    } else if (feature.version === 2 && feature.id === id) {
      var featureData = await (
        await fetch(`/features/${feature.id}/data.json`)
      ).json();
      if (featureData.dynamic) {
        chrome.tabs.query({}, function (tabs) {
          for (var i = 0; i < tabs.length; i++) {
            try {
              chrome.scripting.executeScript({
                args: [feature.id],
                target: { tabId: tabs[i].id },
                func: disableFeature,
                world: "MAIN",
              });
              function disableFeature(f) {
                ScratchTools.disable(f);
              }
            } catch (err) {}
          }
        });
      }
    }
  });
}

var ScratchTools = ScratchTools || {};
ScratchTools.modals = {
  create: function (data) {
    var div = document.createElement("div");
    div.className = "st-modal-blur-bg";

    var modal = document.createElement("div");
    modal.className = "st-modal";

    var h1 = document.createElement("h1");
    h1.textContent = data.title;
    modal.appendChild(h1);

    var p = document.createElement("p");
    p.textContent = data.description;
    modal.appendChild(p);

    var orangeBar = document.createElement("div");
    orangeBar.className = "st-modal-header";

    data.components?.forEach(function (component) {
      if (component.type === "code") {
        var code = document.createElement("code");
        code.textContent = component.content;
        modal.appendChild(code);
      }
    });

    var closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.onclick = function () {
      div.remove();
    };
    modal.appendChild(closeButton);

    div.appendChild(modal);
    modal.prepend(orangeBar);
    document.body.appendChild(div);
  },
};