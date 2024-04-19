const sites = [
  "www.youtube.com",
  "news.ycombinator.com",
  "twitter.com",
  "discord.com",
  "linkedin.com",
  "www.linkedin.com",
  "manifold.markets",
  "polymarket.com",
  "*.substack.com",
  "app.slack.com",
];
const satisfactionQuestions = [
  "What % of your screen time today has been rewarding/gotten you closer to your goals?",
  "Is this page actively bringing you joy, or are you just shutting your brain off?",
  "What's the easiest lecture you could be watching right now?",
];

// Returns a random time delay between 10 and 40 seconds
// Change this to whatever you want
const minWaitingTime = 1_000;
const maxWaitingTime = 3_000;

// content script, to run in the context of the page
// every time we open a new tab in these domains, we'll give the user a full screen prompt.
// covers the page content - user can't use it until we say so.

const getTimeDelay = () => {
  return Math.floor(
    Math.random() * (maxWaitingTime - minWaitingTime) + minWaitingTime
  );
};

// wait until document.body is available, then resolve
function waitForBody() {
  return new Promise((resolve) => {
    if (document.body) {
      resolve();
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          resolve();
          obs.disconnect(); // Stop observing once the body is available
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  });
}

// Create a blank modal on top of the page
const makeModal = () => {
  let modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.zIndex = "99000";
  modal.style.left = "0";
  modal.style.top = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.overflow = "auto";
  modal.style.backgroundColor = "rgba(0,0,0,1)";

  let modalContent = document.createElement("div");
  modalContent.style.backgroundColor = "#fefefe";
  modalContent.style.margin = "15% auto";
  modalContent.style.padding = "20px";
  modalContent.style.border = "1px solid #888";
  modalContent.style.width = "80%";

  modal.appendChild(modalContent);

  // Apply styles here
  let styles = `
.custom-modal-content {
    max-width: 600px;
    word-wrap: break-word;
    padding: 20px; /* Increased padding for spacing */
    border-radius: 10px; /* Rounded corners for the modal content */
    font-size: 18px; /* Increase font size */
    display: flex; 
    flex-direction: column; 
    align-items: center; /* Centering elements in the modal vertically */
}

.custom-modal-content p {
    margin-bottom: 20px; /* Spacing between the text and the input box */
}

.custom-modal-content input {
    width: 60%; /* Making the textbox skinnier */
    padding: 10px;
    margin-top: 10px;
    border: 1px solid #ccc;
    border-radius: 5px; /* Rounded corners for the input box */
    font-size: 16px; /* Setting font size for input */
}

.custom-modal-content button {
    margin-top: 20px;
    padding: 10px 15px;
    background-color: lightpink;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px; /* Rounded corners for the button */
    align-self: center; /* Centering the button in the modal */
}

.custom-modal-content button:hover {
    background-color: red;
}

.custom-modal-content button.exit  {
    background-color:#4CAF50;
}

.circular-progress-container {
    position: relative;
    width: 100px; 
    height: 100px;
    margin: 20px 0;
}

.circular-progress-bar {
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
}

.circular-progress-bar circle {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
}

.background-circle {
    stroke: #e6e6e6;
}

.foreground-circle {
    stroke: red;/*#4CAF50;*/
    stroke-dasharray: 314; /* The circumference of the circle is 2π times the radius (50), roughly 314 */
    stroke-dashoffset: 314;
}

@keyframes progress {
    from {
        stroke-dashoffset: 314;
    }
    to {
        stroke-dashoffset: 0;
    }
}

.close-button {
    position: absolute;
    width: 50px;              /* Same width and height to maintain circle shape */
    height: 50px;
    line-height: 50px;        /* Vertically center the 'X' */
    text-align: center;       /* Horizontally center the 'X' */
    background-color: #4CAF50;  
    border-radius: 50%;       /* Ensure circular shape */
    border: none;
    color: white;
    font-weight: bold;
    font-size: 28px;          /* Adjusted font size for more prominent X */
    cursor: pointer;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.close-line {
    stroke: white;
    stroke-width: 4;
}
    `;

  let styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.body.appendChild(styleSheet);

  let closeModal = () => {
    modal.style.display = "none";
    modal.parentNode.removeChild(modal);
    setTimeout(getSatisfactionLevel, 5 * 1_000);
    modalIsShown = false;
    restoreTitleUpdates(); // Restore title updates when modal is closed
  };

  document.body.appendChild(modal);

  modal.classList.add("custom-modal");
  modalContent.classList.add("custom-modal-content");

  return { modal: modalContent, closeModal };
};

// Close the window - via js (or fallback to background script)
const closeWindow = () => {
  window.close();
  // in case that didn't work, ask the background script to close us
  chrome.runtime.sendMessage({ closeWindow: true });
};

const pauseAllMedia = () => {
  let mediaElements = document.querySelectorAll("video, audio");
  mediaElements.forEach((media) => {
    media.pause();
  });
};
const unPauseAllMedia = () => {
  let mediaElements = document.querySelectorAll("video, audio");
  mediaElements.forEach((media) => {
    media.play();
  });
};

let modalIsShown = false;
// ask the user how happy they are with their productivity
const getSatisfactionLevel = () => {
  modalIsShown = true;
  if (
    sites.some((site) =>
      new RegExp(`^${site.replace(/\*/g, ".*")}$`).test(
        window.location.hostname
      )
    )
  ) {
    pauseAllMedia();
    let { modal, closeModal } = makeModal();

    let question =
      satisfactionQuestions[
        Math.floor(Math.random() * satisfactionQuestions.length)
      ];

    // Make the modal content
    let questionElement = document.createElement("p");
    questionElement.textContent = question;
    modal.appendChild(questionElement);

    let answerInput = document.createElement("input");
    answerInput.type = "text";
    answerInput.value = "";
    answerInput.autocomplete = "off";
    modal.appendChild(answerInput);

    let leaveButton = document.createElement("button");
    leaveButton.textContent = "Leave site";
    leaveButton.classList.add("exit");
    modal.appendChild(leaveButton);
    leaveButton.addEventListener("click", closeWindow);

    let continueButton = document.createElement("button");
    continueButton.textContent = "Keep using site";
    modal.appendChild(continueButton);

    continueButton.addEventListener("click", () => {
      if (answerInput.value === "") {
        return;
      }

      continueButton.style.display = "none";
      leaveButton.style.display = "none";
      // Remove existing countdownElement if exists
      let existingCountdown = document.querySelector(
        ".circular-progress-container"
      );
      if (existingCountdown) {
        existingCountdown.remove();
      }

      let countdown = getTimeDelay() / 1000; // Assuming getTimeDelay returns time in milliseconds
      let duration = countdown; // Store original duration for calculations

      let progressContainer = document.createElement("div");
      progressContainer.classList.add("circular-progress-container");

      let svgNS = "http://www.w3.org/2000/svg";
      let progressBar = document.createElementNS(svgNS, "svg");
      progressBar.setAttributeNS(null, "viewBox", "0 0 100 100");
      progressBar.classList.add("circular-progress-bar");

      let bgCircle = document.createElementNS(svgNS, "circle");
      bgCircle.setAttributeNS(null, "cx", "50");
      bgCircle.setAttributeNS(null, "cy", "50");
      bgCircle.setAttributeNS(null, "r", "47");
      bgCircle.classList.add("background-circle");

      let fgCircle = document.createElementNS(svgNS, "circle");
      fgCircle.setAttributeNS(null, "cx", "50");
      fgCircle.setAttributeNS(null, "cy", "50");
      fgCircle.setAttributeNS(null, "r", "47");
      fgCircle.classList.add("foreground-circle");

      progressBar.appendChild(bgCircle);
      progressBar.appendChild(fgCircle);
      progressContainer.appendChild(progressBar);
      modal.appendChild(progressContainer);

      // Set the animation duration according to the countdown duration
      fgCircle.style.animation = `progress ${duration}s linear forwards`;

      let countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          closeModal();
          shouldGuaranteeClicks = false;
          let mediaElements = document.querySelectorAll("video, audio");
          mediaElements.forEach((media) => {
            media.play();
          });
          setFaviconValue(hiddenUpToDateFaviconValue);
        }
      }, 1000);

      // Create and configure the close button
      let closeButton = document.createElement("div");
      let closeIcon = document.createElementNS(svgNS, "svg");
      closeIcon.setAttributeNS(null, "viewBox", "0 0 40 40");
      closeIcon.classList.add("close-icon");

      let line1 = document.createElementNS(svgNS, "line");
      line1.setAttributeNS(null, "x1", "10");
      line1.setAttributeNS(null, "y1", "10");
      line1.setAttributeNS(null, "x2", "30");
      line1.setAttributeNS(null, "y2", "30");
      line1.classList.add("close-line");

      let line2 = document.createElementNS(svgNS, "line");
      line2.setAttributeNS(null, "x1", "30");
      line2.setAttributeNS(null, "y1", "10");
      line2.setAttributeNS(null, "x2", "10");
      line2.setAttributeNS(null, "y2", "30");
      line2.classList.add("close-line");

      closeIcon.appendChild(line1);
      closeIcon.appendChild(line2);
      closeButton.appendChild(closeIcon);
      closeButton.className = "close-button";

      closeButton.addEventListener("click", closeWindow);

      // Append the close button to the modal
      progressContainer.appendChild(closeButton);
    });

    showBlackFavicon(); // block favicon updates and show a black/gray favicon
    blockTitleUpdates(`${window.location.hostname} is distracting`); // Block title updates and set a custom title
  }
};

let hiddenUpToDateFaviconValue = null; // use the default website favicon
let hiddenUpToDateTitleValue = null; // Store the original title

// black favicon
const blackFavicon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBQJ6AOXWAAA=";
const setFaviconValue = async (newValue = blackFavicon) => {
  const possibleExistingFavicon = document.querySelector('link[rel*="icon"]');
  if (possibleExistingFavicon) {
    if (possibleExistingFavicon.href !== newValue) {
      hiddenUpToDateFaviconValue = possibleExistingFavicon.href;
      // console.log("new hiddenUpToDateFaviconValue", hiddenUpToDateFaviconValue);
      if (hiddenUpToDateFaviconValue === blackFavicon) {
        // console.warn("NONONO ITS BLACK FAVCON");
        return;
      }
      // await new Promise(res=>setTimeout(res,500));
      possibleExistingFavicon.href = newValue;
    }
  } else {
    hiddenUpToDateFaviconValue = null;
    if (newValue) {
      const favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.href = newValue;
      document.head.appendChild(favicon);
    }
    // if newValue is null, don't let there be any favicon
    else {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) document.head.removeChild(favicon);
    }
  }
};

const showBlackFavicon = () => {
  setFaviconValue(blackFavicon);
};
const showHiddenFavicon = () => {
  setFaviconValue(hiddenUpToDateFaviconValue);
};

// Function to block title updates and set a custom title
function blockTitleUpdates(customTitle = "Attention Required!") {
  // console.warn("BLOCKING TITLE UPDATEWS");
  hiddenUpToDateTitleValue = document.title; // Save the current title
  document.title = customTitle;

  const observer = new MutationObserver((mutations) => {
    if (document.title === customTitle) return;
    // console.warn("MUTAIOTNSSSS", mutations);
    if (!modalIsShown) {
      return;
    }
    mutations.forEach((mutation) => {
      if (
        mutation.type === "childList" &&
        mutation.addedNodes.length > 0 &&
        mutation.target.nodeName === "TITLE" &&
        mutation.target.textContent !== customTitle
      ) {
        hiddenUpToDateTitleValue = mutation.target.textContent;
        document.title = customTitle; // Set the custom title when a new <title> element is added
      }
    });
  });
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true,
  });
}

// Function to restore the ability to update the document's title normally
function restoreTitleUpdates() {
  delete document.title; // Remove the custom setter and getter
  document.title = hiddenUpToDateTitleValue; // Restore the original title
}

// block favicon changes, use a solid black favicon when modal is not shown
// Function to block favicon updates
async function blockFaviconUpdates() {
  const observer = new MutationObserver(async (mutations) => {
    mutations.forEach((mutation) => {
      if (modalIsShown) {
        showBlackFavicon();
      }
    });
  });

  setInterval(() => {
    if (modalIsShown) {
      showBlackFavicon();
    }
  }, 500);

  // Start observing the document head for changes
  observer.observe(document.head, {
    childList: true, // Observe the addition of new elements
    attributes: true, // Observe changes to attributes
    attributeFilter: ["href"], // Only observe changes to the href attribute
    subtree: true, // Observe changes in descendants too
    attributeOldValue: true, // Pass the old value of the attribute to the callback
  });
  setFaviconValue(blackFavicon);
}

// Guarantees that we can type in the input box
// Websites with paywalls/intrusive modals can sometimes prevent inputs from being typed in - this fixes that
let shouldGuaranteeClicks = true;
document.addEventListener(
  "focus",
  (event) => {
    const modalTextInput = document.querySelector(
      ".custom-modal-content input"
    );
    if (shouldGuaranteeClicks && event.target === modalTextInput) {
      event.stopImmediatePropagation();
    }
  },
  1
);

window.setFaviconValue = setFaviconValue;

waitForBody().then(getSatisfactionLevel)
