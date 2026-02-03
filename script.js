window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.style.background = '#ffffff';
        navbar.style.padding = '10px 50px';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.9)';
        navbar.style.padding = '20px 50px';
    }
});