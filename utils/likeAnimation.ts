// utils/likeAnimation.ts
export function triggerLikeExplosion(postId: string) {
  const button = document.getElementById(`like-button-${postId}`);
  if (!button) return;

  const heart = button.querySelector("svg, span, .heart-icon") as HTMLElement;
  if (heart) {
    heart.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    heart.style.transform = "scale(1.4)";
    setTimeout(() => {
      heart.style.transform = "scale(0)";
      heart.style.opacity = "0";
    }, 200);
    setTimeout(() => {
      heart.style.transform = "";
      heart.style.opacity = "";
    }, 600);
  }

  const rect = button.getBoundingClientRect();

  // Crear contenedor flotante
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = `${rect.left + rect.width / 2}px`;
  container.style.top = `${rect.top + rect.height / 2}px`;
  container.style.transform = "translate(-50%, -50%)";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999";
  document.body.appendChild(container);

  // Partículas
  const shapes = ["💖", "✨", "💫", "❤️", "🌟"];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("span");
    particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    particle.style.position = "absolute";
    particle.style.fontSize = `${14 + Math.random() * 14}px`;
    particle.style.opacity = "1";
    particle.style.transition = "transform 0.9s ease-out, opacity 0.9s ease-out";
    particle.style.transform = "translate(0, 0) scale(1)";
    container.appendChild(particle);

    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.4;
    const distance = 60 + Math.random() * 40;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    setTimeout(() => {
      particle.style.transform = `translate(${dx}px, ${dy}px) scale(${0.5 + Math.random() * 0.5})`;
      particle.style.opacity = "0";
    }, 10);
  }

  setTimeout(() => container.remove(), 1000);
}
