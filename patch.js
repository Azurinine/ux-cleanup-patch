(function() {
    const style = document.createElement('style');
    style.id = 'ux-cleanup-patch'; 
    
    style.innerHTML = `
        [class*="Paywall-module-scss-module__"]{

            height: 0;
            width: 0;

        }


        /* RESET THE ENVIRONMENT:
           Many reactive UIs lock the <body> scroll when a modal triggers.
           We force 'overflow: auto' to restore user control. */
        body, html {
            overflow: auto !important;
        }
    `;

    // Inject into the <head> to ensure it sits at the end of the cascade
    document.head.appendChild(style);

    console.log("------------------------------------------");
    console.log("UX Patch Applied Successfully.");
    console.log("Strategy: Chained Attribute Specificity (20pts)");
    console.log("------------------------------------------");
})();