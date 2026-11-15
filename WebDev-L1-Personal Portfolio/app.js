const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
const header = document.querySelector(".site-header");
const galleryDialog = document.querySelector(".gallery-lightbox");
const galleryImage = galleryDialog.querySelector("img");
const galleryCaption = galleryDialog.querySelector("p");

function closeNavigation() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  navigation.classList.remove("is-open");
}

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Open navigation" : "Close navigation",
  );
  navigation.classList.toggle("is-open", !isOpen);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNavigation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigation();
});

document.querySelectorAll(".gallery-card").forEach((card) => {
  card.addEventListener("click", () => {
    galleryImage.src = card.dataset.image;
    galleryImage.alt = card.querySelector("img").alt;
    galleryCaption.textContent = card.dataset.caption;
    galleryDialog.showModal();
  });
});

galleryDialog.querySelector(".lightbox-close").addEventListener("click", () => {
  galleryDialog.close();
});

galleryDialog.addEventListener("click", (event) => {
  if (event.target === galleryDialog) galleryDialog.close();
});

galleryDialog.addEventListener("close", () => {
  galleryImage.removeAttribute("src");
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const subject = `Portfolio message from ${formData.get("name")}`;
  const body = [
    `Name: ${formData.get("name")}`,
    `Email: ${formData.get("email")}`,
    "",
    formData.get("message"),
  ].join("\n");
  const mailtoUrl = new URL("mailto:mdmayeen855@gmail.com");
  mailtoUrl.searchParams.set("subject", subject);
  mailtoUrl.searchParams.set("body", body);
  window.location.href = mailtoUrl.href;
});

document.querySelector("#year").textContent = new Date().getFullYear();

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 35);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

if ("IntersectionObserver" in window) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (!reducedMotion) {
    document.documentElement.classList.add("has-js");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
    );

    const revealTargets = document.querySelectorAll(
      ".section-heading, .about-grid > *, .education-card, .skill-card, .project-card, .more-projects-card, .programming-grid > *, .programming-card, .activity-list > article, .certificate-slot, .gallery-card, .contact-kicker, .contact-section h2, .contact-info > *, .social-links > a, .contact-form > *",
    );

    revealTargets.forEach((element, index) => {
      element.setAttribute("data-reveal", "");
      const siblingIndex = [...element.parentElement.children].indexOf(element);
      element.style.setProperty(
        "--reveal-delay",
        `${(siblingIndex % 4) * 75}ms`,
      );
      revealObserver.observe(element);
    });
  }

  const navigationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sectionLink = navigation.querySelector(
          `a[href="#${entry.target.id}"]`,
        );
        if (!sectionLink) return;

        navigation.querySelectorAll("a").forEach((link) => {
          if (link === sectionLink) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-25% 0px -65% 0px" },
  );

  document.querySelectorAll("main section[id]").forEach((section) => {
    navigationObserver.observe(section);
  });
}

const roleLabel = document.querySelector("#role-label");
const roles = [
  "FULL-STACK WEB DEVELOPER",
  "COMPUTER PROGRAMMER",
  "AI & DEEP LEARNING ENTHUSIAST",
];
let roleIndex = 0;

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(() => {
    roleIndex = (roleIndex + 1) % roles.length;
    roleLabel.classList.add("is-changing");
    window.setTimeout(() => {
      roleLabel.textContent = roles[roleIndex];
      roleLabel.classList.remove("is-changing");
    }, 180);
  }, 3000);
}
