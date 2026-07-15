#!/usr/bin/env python3
"""Generate static index.html homepage from contexts-data.json."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "contexts-data.json"
SITE_URL = (ROOT / "site-url.txt").read_text(encoding="utf-8").strip().rstrip("/")

FEATURED = [
    "greetings",
    "at-job-sentences",
    "travel-and-vacations",
    "daily-routines",
    "ordering-food-restaurant",
    "introducing-yourself",
    "software-development-conversations",
    "present-perfect",
]

CATALOG = {
    "Primeiros passos e treino": [
        "greetings",
        "ask-things",
        "introducing-yourself",
        "training-sentences",
        "training-verbs",
        "present-perfect",
        "conditions",
        "past-experiences",
        "talking-about-he-and-she",
        "wishes-and-desires",
    ],
    "Rotina e cotidiano": [
        "daily-routines",
        "morning-routines",
        "night-routines",
        "toddler-routines",
        "house-chores",
        "cooking",
        "talking-about-weather",
    ],
    "Pessoas e convivência": [
        "talking-about-family",
        "talking-about-friends",
        "talking-about-hobbies",
        "talking-about-feelings",
        "talking-about-places",
        "making-invitations",
        "accepting-refusing-invitations",
        "giving-advice",
        "agreeing-and-disagreeing",
        "apologizing",
        "bad-news",
    ],
    "Viagem, compras e serviços": [
        "travel-and-vacations",
        "asking-for-directions",
        "shopping-at-supermarket",
        "ordering-food-restaurant",
        "at-the-doctor",
        "at-the-pharmacy",
        "perform-presentation",
    ],
    "Trabalho e tecnologia": [
        "at-job-sentences",
        "daily-standup-meeting",
        "asking-help-at-work",
        "giving-status-updates",
        "project-discussions",
        "problem-solving-at-work",
        "talking-about-deadlines",
        "email-communication",
        "software-development-conversations",
    ],
}


def excerpt(paragraphs: list[str], max_len: int = 160) -> str:
    text = paragraphs[0]
    if len(text) <= max_len:
        return text
    cut = text[: max_len - 1].rsplit(" ", 1)[0]
    return cut + "…"


def featured_cards(contexts: dict) -> str:
    items = []
    for slug in FEATURED:
        info = contexts[slug]
        items.append(
            f"""        <a class="home-context-card home-context-card--featured" href="./contextos/{slug}.html">
          <h3 class="home-context-card-title">{html.escape(info["title"])}</h3>
          <p class="home-context-card-desc">{html.escape(excerpt(info["paragraphs"]))}</p>
          <span class="home-context-card-link">Praticar agora →</span>
        </a>"""
        )
    return "\n".join(items)


def catalog_sections(contexts: dict) -> str:
    sections = []
    for group_name, slugs in CATALOG.items():
        items = []
        for slug in slugs:
            info = contexts[slug]
            items.append(
                f"""          <li>
            <a class="home-catalog-item" href="./contextos/{slug}.html">
              <span class="home-catalog-link">{html.escape(info["title"])}</span>
              <p class="home-catalog-desc">{html.escape(excerpt(info["paragraphs"], 140))}</p>
            </a>
          </li>"""
            )
        sections.append(
            f"""      <section class="home-catalog-group" aria-labelledby="catalog-{html.escape(group_name.replace(' ', '-').lower())}">
        <h3 class="home-catalog-group-title" id="catalog-{html.escape(group_name.replace(' ', '-').lower())}">{html.escape(group_name)}</h3>
        <ul class="home-catalog-list">
{chr(10).join(items)}
        </ul>
      </section>"""
        )
    return "\n".join(sections)


def build_page(contexts: dict) -> str:
    return f"""<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>English Trainer — Pratique inglês com frases, áudio e tradução</title>
  <meta name="description" content="English Trainer é um site gratuito para praticar inglês com frases reais, tradução em português e áudio. Escolha um contexto — trabalho, viagens, rotina — e treine ouvindo, repetindo e usando o microfone." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="{SITE_URL}/" />
  <link rel="stylesheet" href="./main.css" />
</head>

<body>
  <main class="home-page">
    <header class="home-header">
      <div class="home-header-inner">
        <div class="home-brand">
          <h1 class="home-brand-title">English Trainer</h1>
          <p class="home-brand-tagline">Frases de inglês para português, com áudio</p>
        </div>
        <a class="home-header-cta" href="./contextos/greetings.html">Começar a praticar</a>
      </div>
    </header>

    <div class="home-inner">
      <section class="home-hero simple-card" aria-labelledby="home-hero-title">
        <h2 class="home-section-title" id="home-hero-title">Aprenda inglês por situações reais</h2>
        <p>
          O <strong>English Trainer</strong> é um treinador gratuito que funciona no navegador, sem cadastro.
          Em vez de listas soltas de vocabulário, você pratica <strong>frases completas</strong> organizadas por contexto —
          saudações, trabalho, viagens, rotina, saúde e dezenas de outras situações do dia a dia.
          Cada frase vem com tradução em português e áudio para você ouvir no ritmo certo.
        </p>
        <p>
          O site foi pensado para brasileiros que já têm alguma base em inglês e querem ganhar
          <strong>fluência prática</strong>: entender como se fala de verdade, repetir em voz alta e,
          se quiser, usar o microfone para treinar pronúncia. Não é um curso com aulas longas —
          é prática direta, no seu tempo, uma situação por vez.
        </p>
      </section>

      <section class="home-about simple-card" id="como-praticar" aria-labelledby="home-about-title">
        <h2 class="home-section-title" id="home-about-title">Para quem serve e como praticar</h2>
        <p>
          Serve quem estuda sozinho, quem trabalha com times internacionais, quem vai viajar ou quem simplesmente
          quer revisar estruturas antes de uma conversa. Profissionais de tecnologia encontram contextos como
          daily standup, e-mails e discussões de projeto; quem prefere temas do cotidiano pode começar por
          saudações, rotina da manhã ou pedidos em restaurante.
        </p>
        <p>
          <strong>Como praticar:</strong> escolha um contexto abaixo e abra a lição. Ajuste a velocidade do áudio,
          alterne entre sotaque americano e britânico, ouça frase por frase ou use «Ouvir todos» para simular
          uma sequência. Leia a tradução depois de tentar entender pelo som. Use o botão de microfone nas frases
          em inglês para falar e receber feedback. Volte nos dias seguintes — repetir o mesmo contexto fixa
          mais do que passar por dezenas de temas diferentes numa única sessão.
        </p>
        <p>
          Tudo é gratuito e roda no celular ou no computador. Explore os contextos em destaque para começar
          ou percorra o catálogo completo por tema. Cada página traz uma introdução sobre a situação e dezenas
          de frases prontas para ouvir e repetir.
        </p>
        <p>
          Não há ranking, pressão nem prova final — o objetivo é você se sentir mais preparado na próxima
          conversa, reunião ou viagem. Escolha um tema que faça sentido para a sua semana, pratique dez minutos
          por dia e volte ao mesmo contexto até as frases soarem familiares. Esse ritmo constante costuma
          funcionar melhor do que maratonas esporádicas.
        </p>
      </section>

      <section class="home-featured" aria-labelledby="home-featured-title">
        <h2 class="home-section-title home-section-title--spaced" id="home-featured-title">Contextos populares</h2>
        <p class="home-section-lead">Oito lições para começar hoje — clique para ir direto ao treino.</p>
        <div class="home-context-grid home-context-grid--featured">
{featured_cards(contexts)}
        </div>
      </section>

      <section class="home-catalog" aria-labelledby="home-catalog-title">
        <h2 class="home-section-title home-section-title--spaced" id="home-catalog-title">Catálogo completo de contextos</h2>
        <p class="home-section-lead">
          {len(contexts)} situações com frases, tradução e áudio. Escolha por tema e pratique no seu ritmo.
        </p>
{catalog_sections(contexts)}
      </section>
    </div>

    <footer class="simple-page-footer home-footer" aria-label="Links do site">
      <a href="./index.html">Início</a>
      <a href="./privacy-policy.html">Política de privacidade</a>
      <a href="./cookies.html">Política de cookies</a>
      <a href="./terms.html">Termos</a>
      <a href="./contact.html">Contato</a>
      <a href="./about.html">Sobre</a>
    </footer>
  </main>

  <div id="cookieConsentBanner" class="cookie-consent-banner hidden" role="dialog" aria-label="Consentimento de cookies">
    <p class="cookie-consent-text">
      Usamos cookies para preferências e, ao aceitar, para publicidade (Google AdSense). Veja nossa
      <a href="./cookies.html">Política de cookies</a> e <a href="./privacy-policy.html">Política de privacidade</a>.
    </p>
    <div class="cookie-consent-actions">
      <a href="./cookies.html" class="cookie-consent-link">Política de cookies</a>
      <a href="./privacy-policy.html" class="cookie-consent-link">Política de privacidade</a>
      <button type="button" id="cookieConsentReject" class="cookie-consent-reject">Recusar</button>
      <button type="button" id="cookieConsentAccept" class="cookie-consent-accept">Aceitar</button>
    </div>
  </div>
  <script src="./cookie-consent.js"></script>
</body>

</html>
"""


def main() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    contexts = data["contexts"]
    (ROOT / "index.html").write_text(build_page(contexts), encoding="utf-8")
    print(f"Generated index.html with {len(contexts)} contexts")


if __name__ == "__main__":
    main()
