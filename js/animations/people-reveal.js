/* People — portraits slide up as the row enters the screen.
   Plays each time the section comes in from below; resets once it drops back below the fold. */
(function(){
  "use strict";
  var AS = window.AS || {};
  var section = document.getElementById("people");
  if (!section || AS.reduce || !("IntersectionObserver" in window)) return;

  var STAGGER_MS = 140;   /* delay between portraits */
  var THRESHOLD  = 0.2;   /* share of the row visible before it plays */

  var row = section.querySelector(".people-row");
  var people = [].slice.call(section.querySelectorAll(".person"));
  people.forEach(function(el, i){ el.style.transitionDelay = (i * STAGGER_MS) + "ms"; });
  section.classList.add("js-people-reveal");

  new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) {
        people.forEach(function(el){ el.classList.add("is-in"); });
      } else if (e.boundingClientRect.top > 0) {
        /* left through the bottom edge: reset so it plays again next time */
        people.forEach(function(el){ el.classList.remove("is-in"); });
      }
    });
  }, { threshold: THRESHOLD }).observe(row);
})();
