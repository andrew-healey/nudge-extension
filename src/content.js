const whitelist = [
    "www.youtube.com","news.ycombinator.com","twitter.com"
];

function waitForBody() {
    return new Promise((resolve) => {
        function checkBody() {
            if (document.body) {
                resolve();
            } else {
                setTimeout(checkBody, 10);
            }
        }
        checkBody();
    });
}

// content script, to run in the context of the page
// every time we open a new tab in these domains, we'll give the user a full screen prompt.
// covers the page content - user can't use it until we say so.

const makeModal = () => {
    let modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.zIndex = '99000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,1)';

    let modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '15% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '80%';

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
    `;

    let styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.body.appendChild(styleSheet);

    let closeModal = () => {
        modal.style.display = 'none';
        modal.parentNode.removeChild(modal);
    };

    document.body.appendChild(modal);

    modal.classList.add('custom-modal');
    modalContent.classList.add('custom-modal-content');

    return { modal:modalContent, closeModal };
}

const satisfactionQuestions = [
    "What % of your screen time today has been rewarding/gotten you closer to your goals?",
    "Is this page actively bringing you joy, or are you just shutting your brain off?",
    "What's the easiest lecture you could be watching right now?",
]
const getTimeDelay = 
() => {
    return Math.floor(Math.random() * 30_000) + 10_000;
}

const getSatisfactionLevel = () => {
    console.log("getSatisfactionLevel", window.location.hostname)
    if (whitelist.includes(window.location.hostname)) {
        let mediaElements = document.querySelectorAll('video, audio');
        mediaElements.forEach(media => {
            media.pause();
        });

        let { modal, closeModal } = makeModal();

        let question = satisfactionQuestions[Math.floor(Math.random() * satisfactionQuestions.length)];
        let questionElement = document.createElement('p');
        questionElement.textContent = question;
        modal.appendChild(questionElement);

        let answerInput = document.createElement('input');
        modal.appendChild(answerInput);

        let leaveButton = document.createElement('button');
        leaveButton.textContent = 'Leave site';
	leaveButton.classList.add("exit");
        modal.appendChild(leaveButton);
        leaveButton.addEventListener('click', () => {
		window.close();
	});

        let continueButton = document.createElement('button');
        continueButton.textContent = 'Keep using site';
        modal.appendChild(continueButton);

        continueButton.addEventListener('click', () => {
            continueButton.style.display = 'none';
            leaveButton.style.display = 'none';
            // Remove existing countdownElement if exists
            let existingCountdown = document.querySelector('.circular-progress-container');
            if(existingCountdown) {
                existingCountdown.remove();
            }

            let countdown = getTimeDelay() / 1000; // Assuming getTimeDelay returns time in milliseconds
            let duration = countdown; // Store original duration for calculations

            let progressContainer = document.createElement('div');
            progressContainer.classList.add('circular-progress-container');

            let svgNS = "http://www.w3.org/2000/svg";
            let progressBar = document.createElementNS(svgNS, 'svg');
            progressBar.setAttributeNS(null, 'viewBox', '0 0 100 100');
            progressBar.classList.add('circular-progress-bar');

            let bgCircle = document.createElementNS(svgNS, 'circle');
            bgCircle.setAttributeNS(null, 'cx', '50');
            bgCircle.setAttributeNS(null, 'cy', '50');
            bgCircle.setAttributeNS(null, 'r', '47');
            bgCircle.classList.add('background-circle');

            let fgCircle = document.createElementNS(svgNS, 'circle');
            fgCircle.setAttributeNS(null, 'cx', '50');
            fgCircle.setAttributeNS(null, 'cy', '50');
            fgCircle.setAttributeNS(null, 'r', '47');
            fgCircle.classList.add('foreground-circle');

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
                    mediaElements.forEach(media => {
                        media.play();
                    });
                }
            }, 1000);

            // Create and configure the close button
            let closeButton = document.createElement('div');
            closeButton.textContent = 'X';
            closeButton.className = 'close-button';

            closeButton.addEventListener('click', () => {
                window.close();
            });

            // Append the close button to the modal
            progressContainer.appendChild(closeButton);

        });
    }
}

waitForBody().then(getSatisfactionLevel);
