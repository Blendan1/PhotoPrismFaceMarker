{
    const isUserUsingMobile = () => {

        // User agent string method
        let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Screen resolution method
        if (!isMobile) {
            let screenWidth = window.screen.width;
            let screenHeight = window.screen.height;
            isMobile = (screenWidth < 768 || screenHeight < 768);
        }

        // Touch events method
        if (!isMobile) {
            isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
        }

        // CSS media queries method
        if (!isMobile) {
            let bodyElement = document.getElementsByTagName('body')[0];
            isMobile = window.getComputedStyle(bodyElement).getPropertyValue('content').indexOf('mobile') !== -1;
        }

        return isMobile;
    };

    const config = {attributes: false, childList: true, subtree: true};

    const useSquare = true;

    let displayOpen = false;

    /** Callback function to execute when mutations are observed
     * Is used manipulate the HTML
     */
    const callback = function (mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes[0] !== undefined && mutation.addedNodes[0].className === 'p-tab p-tab-photo-people') {
                    setTimeout(function () {
                        const facesContainer = document.querySelector('.p-tab-photo-people > .p-faces');
                        //#region Adding Full image preview

                        const imgContainer = document.createElement('div');
                        imgContainer.style.position = 'relative';
                        const img = document.createElement('img');
                        img.style.maxWidth = "100vw";
                        img.style.maxHeight = "100vh";
                        imgContainer.style.display = displayOpen ? "block" : "none";
                        img.onload = function () {
                            imgContainer.style.height = img.offsetHeight + "px";
                            imgContainer.style.width = img.offsetWidth + "px";
                            const model = document.querySelector(".p-tab.p-tab-photo-people").__vue__.$props.model;
                            renderExistingOn(imgContainer, model.getMarkers(true),
                                img.offsetWidth, img.offsetHeight);
                        };

                        new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.intersectionRatio > 0) {
                                    const vue = document.querySelector(".p-tab.p-tab-photo-people").__vue__;
                                    const model = vue.$props.model;
                                    img.src = model.thumbnailUrl("fit_1280");
                                }
                            });
                        }).observe(img);
                        imgContainer.append(img);
                        facesContainer.prepend(imgContainer);

                        {
                            const btn = document.createElement('button');
                            btn.className = 'v-btn v-btn--depressed theme--dark primary-button';
                            facesContainer.prepend(btn);
                            btn.onclick = function () {
                                displayOpen = !displayOpen;
                                setIsOpen();
                            };

                            setIsOpen();

                            function setIsOpen() {
                                if (displayOpen) {
                                    btn.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--light\" style=\"font-size: 18px;\">arrow_drop_down</i>";
                                    imgContainer.style.display = "block";
                                } else {
                                    btn.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--light\" style=\"font-size: 18px;\">arrow_drop_up</i>";
                                    imgContainer.style.display = "none";
                                }
                            }
                        }
                        //#endregion


                        //#region Adding button for adding faces
                        {
                            const btn = document.createElement('button');
                            btn.className = 'v-btn v-btn--depressed theme--dark primary-button';
                            btn.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--light\" style=\"font-size: 18px;\">add</i>";
                            facesContainer.prepend(btn);
                            btn.onclick = markFace;
                        }
                        //#endregion

                    }, 1);
                }
            }
        }
    };

    function renderExistingOn(drawPlane, markers, width, height) {
        drawPlane.querySelectorAll(".marker").forEach(m => m.remove());
        markers.forEach(marker => {
            const div = document.createElement("div");
            div.classList.add("marker");
            div.classList.add("faces-merker-existing");
            div.style.border = "2px dotted gray";

            if (marker.Name) {
                div.style.border = "2px dotted green";
            }

            div.style.position = "absolute";

            div.style.left = (marker.X * width) + "px";
            div.style.top = (marker.Y * height) + "px";
            div.style.height = (marker.H * height) + "px";
            div.style.width = (marker.W * width) + "px";

            div.title = marker.Name;

            drawPlane.prepend(div);
        });
    }

    /**
     * Opens the popup for marking faces
     */
    function markFace() {
        const isMobile = isUserUsingMobile();
        const vue = document.querySelector(".p-tab.p-tab-photo-people").__vue__;
        const model = vue.$props.model;
        const api = vue.$api;

        async function addMarker(x, y, w, h) {
            const file = model.Files.find(f => f.Primary);
            await api.post("markers", {FileUID: file.UID, X: x, Y: y, W: w, H: h, SubjSrc: "manual"});
            await model.load();
            vue.$data.markers = model.getMarkers(true);
        }

        const container = document.createElement("div");
        const image = document.createElement("img");
        let width = image.offsetWidth, height = image.offsetHeight;

        image.onload = function () {
            setTimeout(function () {
                const drawPlane = document.createElement("div");
                width = image.offsetWidth;
                height = image.offsetHeight;
                drawPlane.style.height = height + "px";
                drawPlane.style.width = width + "px";
                container.append(drawPlane);
                drawPlane.classList.add("faces-extra-popup" + (isMobile ? "-mobile" : ""));

                renderExistingOn(drawPlane, model.getMarkers(true), width, height);


                let draw = {}, isDrawing = false, isMove = false, isOnTarget = false, lastTouch = false;

                function setDrawMax() {
                    draw.x = Math.max(draw.x, 0);
                    draw.y = Math.max(draw.y, 0);

                    draw.x = Math.min(draw.x, width);
                    draw.y = Math.min(draw.y, height);

                    if (isMove) {
                        draw.x = Math.max(draw.x, (draw.w < 0 ? Math.abs(draw.w) : 0));
                        draw.y = Math.max(draw.y, (draw.h < 0 ? Math.abs(draw.h) : 0));

                        draw.x = Math.min(draw.x, width - (draw.w < 0 ? 0 : draw.w));
                        draw.y = Math.min(draw.y, height - (draw.h < 0 ? 0 : draw.h));
                    } else if (useSquare) {
                        let maxDim = Math.abs(Math.max(Math.abs(draw.w), Math.abs(draw.h)));

                        if (draw.w < 0) {
                            maxDim = Math.min(draw.x, maxDim);
                        } else {
                            maxDim = Math.min(width - draw.x, maxDim);
                        }

                        if (draw.h < 0) {
                            maxDim = Math.min(draw.y, maxDim);
                        } else {
                            maxDim = Math.min(height - draw.y, maxDim);
                        }

                        draw.w = maxDim * (draw.w < 0 ? -1 : 1);
                        draw.h = maxDim * (draw.h < 0 ? -1 : 1);
                    }
                }

                function changeDraw() {
                    if (!draw.obj) {
                        draw.obj = document.createElement("div");
                        draw.obj.style.border = "2px solid red";
                        draw.obj.style.position = "absolute";
                        const drawChild = document.createElement("div");
                        drawChild.classList.add("face-draw-child");
                        draw.obj.appendChild(drawChild);

                        draw.obj.classList.add("face-draw");


                        drawPlane.appendChild(draw.obj);
                    }

                    setDrawMax();

                    let x = draw.w < 0 ? draw.x - Math.abs(draw.w) : draw.x;
                    let y = draw.h < 0 ? draw.y - Math.abs(draw.h) : draw.y;
                    draw.obj.style.left = x + "px";
                    draw.obj.style.top = y + "px";
                    draw.obj.style.width = Math.abs(draw.w) + "px";
                    draw.obj.style.height = Math.abs(draw.h) + "px";
                }

                function saveDraw() {
                    setDrawMax();
                    let x = draw.w < 0 ? draw.x - Math.abs(draw.w) : draw.x;
                    let y = draw.h < 0 ? draw.y - Math.abs(draw.h) : draw.y;
                    let w = Math.abs(draw.w);
                    let h = Math.abs(draw.h);

                    // photo prism works with relative numbers from 0-1
                    x = x / width;
                    y = y / height;
                    w = w / width;
                    h = h / height;

                    addMarker(x, y, w, h).then(() => {
                        renderExistingOn(drawPlane, model.getMarkers(true), width, height);
                    });

                    draw.obj?.remove();
                    draw = {};
                    isDrawing = false;
                    setSaveCancelBtn();
                }

                function onClick(x, y, target) {
                    if (!isDrawing) {
                        isDrawing = true;
                        isOnTarget = true;
                        draw = {
                            x: x - image.getBoundingClientRect().left,
                            y: y - image.getBoundingClientRect().top,
                            w: 0,
                            h: 0,
                        };
                        setSaveCancelBtn();
                        changeDraw();
                    } else {
                        isMove = target.classList.contains("face-draw-child");
                        isOnTarget = target.classList.contains("face-draw");
                    }
                    draw.Lx = x;
                    draw.Ly = y;
                }

                function onMouseMove(x, y) {
                    if (isDrawing && (isOnTarget || isMove)) {
                        if (isMove) {
                            draw.x += x - draw.Lx;
                            draw.y += y - draw.Ly;
                        } else {
                            draw.w += x - draw.Lx;
                            draw.h += y - draw.Ly;
                        }

                        draw.Lx = x;
                        draw.Ly = y;
                        changeDraw();
                    }
                }

                const btnContainer = document.createElement('div');
                const btnClose = document.createElement('button');
                btnClose.className = 'compact action-close v-btn v-btn--depressed theme--light secondary-light faces-extra-popup-button';
                btnClose.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--dark\" style=\"font-size: 18px;\">clear</i>";
                btnClose.onclick = function () {
                    container.remove();
                };

                const btnSave = document.createElement('button');
                const btnCancel = document.createElement('button');
                btnSave.className = 'v-btn v-btn--depressed theme--dark primary-button';
                btnSave.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--dark\" style=\"font-size: 18px;\">save</i>";
                btnCancel.className = 'compact action-close v-btn v-btn--depressed theme--light secondary-light';
                btnCancel.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--dark\" style=\"font-size: 18px;\">clear</i>";

                btnContainer.classList.add("faces-extra-popup-buttons");

                btnContainer.append(btnCancel);

                btnCancel.onclick = function () {
                    if (draw.obj) {
                        draw.obj.remove();
                    }
                    draw = {};
                    isDrawing = false;
                    setSaveCancelBtn();
                };

                btnContainer.append(btnSave);

                btnSave.onclick = function () {
                    saveDraw();
                };

                container.append(btnContainer);
                container.append(btnClose);

                function setSaveCancelBtn() {
                    btnContainer.style.display = isDrawing ? "flex" : "none";
                    btnClose.style.display = !isDrawing ? "block" : "none";
                }

                setSaveCancelBtn();

                if (isMobile) {
                    drawPlane.ontouchstart = function (e) {
                        lastTouch = true;
                        onClick(e.touches[0].clientX, e.touches[0].clientY, e.target);
                    };

                    drawPlane.ontouchmove = function (e) {
                        lastTouch = true;
                        e.preventDefault();
                        onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
                    };

                    drawPlane.ontouchend = function () {
                        lastTouch = true;
                        isMove = false;
                    };
                }

                drawPlane.oncontextmenu = function (e) {
                    e.preventDefault();
                    if(lastTouch) {
                        return;
                    }
                    if (isDrawing) {
                        if (draw.obj) {
                            draw.obj.remove();
                        }
                        draw = {};
                        isDrawing = false;
                        setSaveCancelBtn();
                    } else {
                        container.remove();
                    }
                };

                drawPlane.onmousedown = function (e) {
                    e.preventDefault();
                    //right click is handelt separately
                    if (e.which === 3 || e.button === 2) {
                        return;
                    }
                    lastTouch = false;
                    onClick(e.clientX, e.clientY, e.target);
                };

                drawPlane.ondblclick = function (e) {
                    lastTouch = false;
                    if (e.target.classList.contains("face-draw-child")) {
                        saveDraw();
                    }
                };

                drawPlane.onmouseup = function () {
                    lastTouch = false;
                    isMove = false;
                    isOnTarget = false;
                };

                drawPlane.onmousemove = function (e) {
                    onMouseMove(e.clientX, e.clientY);
                };
            }, 100);
        };

        image.src = model.thumbnailUrl("fit_1280");

        if (!isMobile) {
            image.style.maxWidth = "100vw";
            image.style.maxHeight = "100vh";
        } else {
            container.style.overflow = "auto";
        }
        image.classList.add("faces-extra-popup" + (isMobile ? "-mobile" : ""));

        container.append(image);

        container.classList.add("faces-extra-popup-container");

        document.body.append(container);
    }

    {
        const installIntervall = setInterval(() => {
            // This node doesn't immediately exists so it's better to wait 1 second or so
            const targetNode = document.getElementById('app');

            if (!targetNode) {
                return;
            }
            clearInterval(installIntervall);
            // Create an observer instance linked to the callback function
            const observer = new MutationObserver(callback);
            // Start observing the target node for configured mutations
            observer.observe(targetNode, config);

            const style = document.createElement('style');
            // language=CSS
            style.innerHTML = `
                .faces-extra-popup {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translateX(-50%) translateY(-50%) !important;
                }

                .faces-extra-popup-mobile {
                    position: absolute;
                    left: 0;
                    top: 0;
                }

                .faces-extra-popup-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 9999;
                    background-color: rgba(0, 0, 0, 0.5);
                }

                .face-draw-child {
                    position: absolute;
                    top: 10%;
                    left: 10%;
                    width: 80%;
                    height: 80%;
                    cursor: move;
                }

                .face-draw {
                    cursor: se-resize;
                }

                .faces-extra-popup-buttons {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: fixed;
                    bottom: 5px;
                    left: 0;
                }

                .faces-extra-popup-button {
                    display: block;
                    justify-content: center;
                    align-items: center;
                    position: fixed !important;
                    bottom: 5px;
                    left: 0;
                }
            `;
            document.head.appendChild(style);

        }, 500);
    }
}