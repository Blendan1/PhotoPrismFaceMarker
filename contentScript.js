const config = {attributes: false, childList: true, subtree: true};

const useSquare = false;

// Callback function to execute when mutations are observed
const callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            if (mutation.addedNodes[0] !== undefined && mutation.addedNodes[0].className === 'p-tab p-tab-photo-people') {
                setTimeout(function () {
                    const facesContainer = document.querySelector('.p-tab-photo-people > .p-faces');
                    const btn = document.createElement('button');
                    btn.className = 'v-btn v-btn--depressed theme--dark primary-button';
                    btn.innerHTML = "<i aria-hidden=\"true\" class=\"v-icon material-icons theme--light\" style=\"font-size: 18px;\">add</i>";
                    facesContainer.prepend(btn);

                    btn.onclick = markFace;

                    //document.querySelector(".p-tab.p-tab-photo-people").__vue__.$props.model.getMarkers(true)
                    //model.thumbnailUrl("fit_1280")
                    //document.querySelector(".p-tab.p-tab-photo-people").__vue__.$api.post("markers", {FileUID: "fs3f7jk1w10gauk1",X: 0, Y: 0, W: 1, H: 1, SubjSrc: "manual"})
                    //document.querySelector(".p-tab.p-tab-photo-people").__vue__.$props.model.load()
                }, 1);
            }
        }
    }
};

function markFace() {
    const vue = document.querySelector(".p-tab.p-tab-photo-people").__vue__;
    const model = vue.$props.model;
    const api = vue.$api;

    async function addMarker(x, y, w, h) {
        await api.post("markers", {FileUID: model.Files[0].UID, X: x, Y: y, W: w, H: h, SubjSrc: "manual"});
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
            drawPlane.style.position = "absolute";
            drawPlane.style.top = "0";
            drawPlane.style.left = "0";
            container.append(drawPlane);

            function renderExisting() {
                drawPlane.querySelectorAll(".marker").forEach(m => m.remove());
                const markers = model.getMarkers(true);
                markers.forEach(marker => {
                    const div = document.createElement("div");
                    div.classList.add("marker");
                    div.style.border = "2px dotted gray";
                    div.style.position = "absolute";

                    div.style.left = (marker.X * width) + "px";
                    div.style.top = (marker.Y * height) + "px";
                    div.style.height = (marker.H * height) + "px";
                    div.style.width = (marker.W * width) + "px";
                    drawPlane.prepend(div);
                });
                console.log(markers);
            }

            renderExisting();

            drawPlane.oncontextmenu = function (e) {
                e.preventDefault();
                container.remove();
            };

            let draw = {}, isDrawing = false;

            function changeDraw() {
                if (!draw.obj) {
                    draw.obj = document.createElement("div");
                    draw.obj.style.border = "2px solid red";
                    draw.obj.style.position = "absolute";
                    drawPlane.appendChild(draw.obj);
                }

                let maxDim = null;

                let x = draw.w < 0 ? draw.x - Math.abs(draw.w) : draw.x;
                let y = draw.h < 0 ? draw.y - Math.abs(draw.h) : draw.y;

                if(useSquare) {
                    maxDim = Math.max(Math.abs(draw.w), Math.abs(draw.h));
                    x = maxDim < 0 ? draw.x - Math.abs(maxDim) : draw.x;
                    y = maxDim < 0 ? draw.y - Math.abs(maxDim) : draw.y;
                }
                draw.obj.style.left = x + "px";
                draw.obj.style.top = y + "px";
                draw.obj.style.width = Math.abs(maxDim === null ? draw.w : maxDim) + "px";
                draw.obj.style.height = Math.abs(maxDim === null ? draw.h : maxDim) + "px";
            }

            drawPlane.onmousedown = function (e) {
                e.preventDefault();

                if (isDrawing) {
                    if (useSquare) {
                        const maxDim = Math.max(Math.abs(draw.w), Math.abs(draw.h));
                        draw.w = maxDim;
                        draw.h = maxDim;
                    }
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
                        renderExisting();
                    });

                    draw.obj.remove();
                    isDrawing = false;
                    return;
                }

                if (draw.obj) {
                    draw.obj.remove();
                }

                draw = {
                    x: e.clientX,
                    y: e.clientY,
                    w: 0,
                    h: 0,
                };
                isDrawing = true;
                changeDraw();
            };

            drawPlane.onmousemove = function (e) {
                if (isDrawing) {
                    draw.w = e.clientX - draw.x;
                    draw.h = e.clientY - draw.y;
                    changeDraw();
                }
            };
        }, 100);
    };

    image.src = model.thumbnailUrl("fit_1280");

    image.style.maxWidth = "100vw";
    image.style.maxHeight = "100vh";
    image.position = "absolute";
    image.style.top = "0";
    image.style.left = "0";

    container.append(image);

    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.height = "100vh";
    container.style.width = "100vw";
    container.style.zIndex = "9999999";

    document.body.append(container);

}


setTimeout(() => {

    // This node doesn't immediately exists so it's better to wait 1 second or so
    const targetNode = document.getElementById('app');
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);
    console.log(targetNode);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

}, 1000);

// Receive message with new coordinates
top.window.addEventListener("message", function (message) {
    console.log(message.data);
    setTimeout(function () {
        // This is necessary because Vue.js responds by default to the input event rather than change event
        var event = new Event('input');
        var leftBox = document.getElementsByClassName('input-latitude')[0];
        leftBox.firstChild.firstChild.firstChild.childNodes[1].value = message.data.coordinates.lat;
        leftBox.firstChild.firstChild.firstChild.childNodes[1].dispatchEvent(event);
        var rightBox = document.getElementsByClassName('input-longitude')[0];
        rightBox.firstChild.firstChild.firstChild.childNodes[1].value = message.data.coordinates.lon;
        rightBox.firstChild.firstChild.firstChild.childNodes[1].dispatchEvent(event);
    }, 10);
});