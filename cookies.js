document.addEventListener('DOMContentLoaded', () => {
    initCookieConsent();
});

function initCookieConsent() {
    // Vérifier si l'utilisateur a déjà fait un choix
    const consent = localStorage.getItem('site_cookie_consent');
    if (consent) return; // Choix déjà enregistré, pas de bannière

    // Création dynamique du bandeau
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
        <div class="cookie-content">
            <div class="cookie-text">
                <span class="cookie-icon">🍪</span>
                <p>
                    Nous utilisons des cookies et technologies locales (stockage de session) pour assurer le bon fonctionnement du site, la gestion de vos réservations et l'affichage de notre carte interactive. 
                    Consultez notre <a href="confidentialite.html" target="_blank">Politique de confidentialité</a>.
                </p>
            </div>
            <div class="cookie-actions">
                <button id="btn-cookie-refuse" class="btn-cookie btn-cookie-refuse">Refuser</button>
                <button id="btn-cookie-accept" class="btn-cookie btn-cookie-accept">Accepter tout</button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    // Événements
    document.getElementById('btn-cookie-accept').addEventListener('click', () => {
        localStorage.setItem('site_cookie_consent', 'accepted');
        masquerBanniere();
    });

    document.getElementById('btn-cookie-refuse').addEventListener('click', () => {
        localStorage.setItem('site_cookie_consent', 'essential_only');
        masquerBanniere();
    });
}

function masquerBanniere() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(20px)';
        setTimeout(() => banner.remove(), 300);
    }
}