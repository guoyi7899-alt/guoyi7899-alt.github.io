(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }

  toggle.addEventListener("click", function () {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });
})();

(function () {
  var form = document.getElementById("inquiry-form");
  if (!form) return;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = ((form.elements.name && form.elements.name.value) || "").trim();
    var org = ((form.elements.organization && form.elements.organization.value) || "").trim();
    var message = ((form.elements.message && form.elements.message.value) || "").trim();
    var subject = "Inquiry from " + (name || "website visitor");
    if (org) subject += " (" + org + ")";
    var body = "";
    if (name) body += "Name: " + name + "\n";
    if (org) body += "Organization: " + org + "\n";
    if (name || org) body += "\n";
    body += message;
    window.location.href =
      "mailto:contact@geek-innovation.com?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
  });
})();
