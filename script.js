const myWork = [
    { title: "Cetaphil Post", category: "PRODUCT DESIGN", images: ["images/CetaphilAD01.png"] }, 
    { title: "BGMI", category: "THUMBNAIL", images: ["images/BGMI(Mere He sab se aacha hai).png", "images/layer8.png", "images/Layer10.png"] },
    { title: "Watchparty Thumbnail", category: "THUMBNAIL", images: ["images/Watchtogther.png"] },
    { title: "Profile Logo", category: "LOGO", images: ["images/LogoSTU01.png"] },
    { title: "Interstellar Wallpaper", category: "WALLPAPER", images: ["images/STU.png"] },
    { title: "Valo Thumbnail", category: "THUMBNAIL", images: ["images/Chamber1-Recovered.jpg"] },
    { title: "COD Thumbnail", category: "THUMBNAIL", images: ["images/COD2.png"] },
    { title: "Prompt Mania", category: "EVENT POSTER", images: ["images/PROMPTMFinal.png"] },
    { title: "Profile Logo", category: "LOGO", images: ["images/Vantagelab.png"] },
    { title: "Post-Design", category: "POST", images: ["images/Pin01.png"] }, 
    { title: "Post-Design", category: "POST", images: ["images/Pin01B.png"] }, 
];

function displayWork() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = myWork.map(project => `
        <div class="card"> 
            <div class="zoom-tag">CLICK TO ZOOM</div>
            <div class="multi-image-container">
                ${project.images.map(img => `
                    <img src="${img}" class="gallery-img" onclick="openModal('${img}')">
                `).join('')}
            </div>
            <div class="card-info">
                <span class="section-label">${project.category}</span>
                <h3>${project.title}</h3>
            </div>
        </div>
    `).join('');
}

function openModal(src) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("fullImg");
    modal.style.display = "flex";
    modalImg.src = src;
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}

// Close when clicking outside the image
window.onclick = function(event) {
    const modal = document.getElementById("imageModal");
    if (event.target == modal) {
        closeModal();
    }
}

displayWork();