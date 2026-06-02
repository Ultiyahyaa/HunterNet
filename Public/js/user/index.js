/* =========================
   PAGE ROUTING
========================= */

const pageContainer =
    document.getElementById("page-container");

const navLinks =
    document.querySelectorAll("[data-page]");

const headlines = [

    "[ALERT] International Encryption Adoption Up 4.2%",
    "[REPORT] Data Collection Transparency Audit Released",
    "[WATCH] ISP Metadata Retention Expansion Under Review",
    "[NOTICE] Digital Rights Conference Scheduled For July",
    "[ANALYSIS] Cross-Border Surveillance Trends Updated",
    "[TRACKING] 6,771 Data Breaches Cataloged This Year",
    "[ARCHIVE] Public Records Repository Synchronized",
    "[UPDATE] Research Node #17 Submitted New Findings"

];

/* =========================
   PAGE LOADER
========================= */

function loadPage(pageName, pushHistory = true) {

    const template =
        document.getElementById(`${pageName}-template`);

    if (!template) {

        console.warn(`Page "${pageName}" not found`);

        return;

    }

    pageContainer.classList.add("page-exit");

    setTimeout(() => {

        pageContainer.innerHTML =
            template.innerHTML;

        pageContainer.classList.remove("page-exit");

        pageContainer.classList.add("page-enter");

        setTimeout(() => {

            pageContainer.classList.remove("page-enter");

        }, 350);

        updateActiveLink(pageName);

        buildTicker();

        animateStats();

        if (pushHistory) {

            history.pushState(
                { page: pageName },
                "",
                `/${pageName}`
            );

        }

    }, 200);

}

/* =========================
   ACTIVE NAV
========================= */

function updateActiveLink(pageName) {

    navLinks.forEach(link => {

        if (
            link.dataset.page === pageName
        ) {

            link.classList.add("active");

        } else {

            link.classList.remove("active");

        }

    });

}

/* =========================
   NAVIGATION
========================= */

navLinks.forEach(link => {

    link.addEventListener("click", e => {

        e.preventDefault();

        const page =
            link.dataset.page;

        loadPage(page);

    });

});

/* =========================
   BROWSER HISTORY
========================= */

window.addEventListener(
    "popstate",
    event => {

        const page =
            event.state?.page ||
            "home";

        loadPage(
            page,
            false
        );

    }
);

/* =========================
   TICKER
========================= */

function buildTicker() {

    const tickerTrack =
        document.getElementById(
            "tickerTrack"
        );

    if (!tickerTrack) return;

    tickerTrack.innerHTML = "";

    for (let i = 0; i < 4; i++) {

        headlines.forEach(headline => {

            const span =
                document.createElement(
                    "span"
                );

            span.textContent =
                headline;

            tickerTrack.appendChild(
                span
            );

        });

    }

}

/* =========================
   RANDOM TICKER UPDATES
========================= */

const types = [
    "ALERT", "REPORT", "WATCH", "NOTICE",
    "ANALYSIS", "TRACKING", "UPDATE", "ARCHIVE"
];

const subjects = [
    "Global Privacy Index",
    "International Data Policy",
    "Public Records Network",
    "Cross-Border Surveillance Grid",
    "Digital Rights Framework",
    "Transparency Initiative",
    "Encryption Standard Model",
    "Metadata Retention Policy",
    "Research Node Cluster",
    "Public Archive Mirror"
];

const actions = [
    "Updated",
    "Expanded",
    "Reviewed",
    "Recalibrated",
    "Synchronized",
    "Audited",
    "Published",
    "Verified",
    "Revised"
];

const objects = [
    "across global nodes",
    "under active review",
    "following new compliance cycle",
    "within threshold parameters",
    "across distributed systems",
    "under transparency mandate",
    "in real-time audit stream",
    "across secure channels"
];

const regions = ["EU Node", "NA Grid", "APAC Relay", "Global Mesh"];

const numbers = () =>
    (Math.random() * 100).toFixed(1);

const randomFrom = (arr) =>
    arr[Math.floor(Math.random() * arr.length)];

function generateHeadline() {
    const type = randomFrom(types);
    const subject = randomFrom(subjects);
    const action = randomFrom(actions);
    const object = randomFrom(objects);

    // optional spice: sometimes include stats
    const includeStat = Math.random() < 0.35;

    if (includeStat) {
        return `[${type}] ${subject} ${action} ${object} (${numbers()}%) in ${randomFrom(regions)}\``;
    }

    return `[${type}] ${subject} ${action} ${object} in ${randomFrom(regions)}`;
}

setInterval(() => {

    const randomHeadlineIndex = Math.floor(Math.random() * headlines.length);

    headlines[randomHeadlineIndex] = generateHeadline();

    buildTicker();

}, 30000);

/* =========================
   STAT COUNTERS
========================= */

function animateStats() {

    const stats =
        document.querySelectorAll(
            ".stat-number"
        );

    stats.forEach(stat => {

        const target =
            parseInt(
                stat.textContent.replace(
                    /,/g,
                    ""
                )
            );

        if (
            Number.isNaN(target)
        ) return;

        let current = 0;

        const increment =
            Math.ceil(
                target / 80
            );

        stat.textContent = "0";

        const interval =
            setInterval(() => {

                current += increment;

                if (
                    current >= target
                ) {

                    current =
                        target;

                    clearInterval(
                        interval
                    );

                }

                stat.textContent =
                    current.toLocaleString();

            }, 20);

    });

}

/* =========================
   INITIAL LOAD
========================= */

const path =
    window.location.pathname
        .replace(/^\/+/, "");

const validPages = [
    "home",
    "articles",
    "privacy",
    "leaks",
    "about"
];

const startingPage =
    validPages.includes(path)
        ? path
        : "home";

loadPage(
    startingPage,
    false
);