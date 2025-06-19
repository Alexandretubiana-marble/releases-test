const fetch = require('node-fetch');

// Utilitaire : transforme un texte Markdown en tableau de blocs Slack avec images intercalées
function parseMarkdownToSlackBlocks(markdownText, prBaseUrl) {
  const blocks = [];
  // Regex pour détecter les images Markdown : ![alt](url)
  const regexImg = /!\[(.*?)\]\((.*?)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = regexImg.exec(markdownText)) !== null) {
    const index = match.index;

    // Texte avant l'image
    if (index > lastIndex) {
      let textSegment = markdownText.substring(lastIndex, index).trim();
      if (textSegment) {
        textSegment = formatMarkdownText(textSegment, prBaseUrl);
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: textSegment,
          },
        });
      }
    }

    // Image trouvée
    const alt = match[1];
    const url = match[2];
    blocks.push({
      type: "image",
      image_url: url,
      alt_text: alt || "image",
    });

    lastIndex = regexImg.lastIndex;
  }

  // Texte après la dernière image
  if (lastIndex < markdownText.length) {
    let textSegment = markdownText.substring(lastIndex).trim();
    if (textSegment) {
      textSegment = formatMarkdownText(textSegment, prBaseUrl);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: textSegment,
        },
      });
    }
  }

  return blocks;
}

// Fonction de mise en forme texte Slack : titres en gras, puces, liens #PR
function formatMarkdownText(text, prBaseUrl) {
  // Remplacer titres #, ##, ### par gras
  text = text.replace(/^### (.*)$/gm, '*$1*');
  text = text.replace(/^## (.*)$/gm, '*$1*');
  text = text.replace(/^# (.*)$/gm, '*$1*');

  // Remplacer puces - par • (seulement en début de ligne)
  text = text.replace(/^- /gm, '• ');

  // Remplacer #123 par un lien vers PR
  text = text.replace(/#(\d+)/g, (match, p1) => {
    const url = `${prBaseUrl}/pull/${p1}`;
    return `<${url}|#${p1}>`;
  });

  return text;
}

module.exports = { parseMarkdownToSlackBlocks, formatMarkdownText };

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const repo = process.env.GITHUB_REPOSITORY;
const release = {
  name: process.env.RELEASE_NAME || process.env.RELEASE_TAG,
  tag_name: process.env.RELEASE_TAG,
  html_url: process.env.RELEASE_URL,
  body: process.env.RELEASE_BODY
};

async function postReleaseToSlack(release) {
  const prBaseUrl = `https://github.com/${repo}`;
  const blocks = parseMarkdownToSlackBlocks(release.body, prBaseUrl);

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚀 New release: ${release.name}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔗 <${release.html_url}|View on GitHub>`,
        },
      },
      { type: "divider" },
      ...blocks,
    ],
  };

  console.log("Sending to Slack with payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(slackWebhookUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();

  if (res.status !== 200 || text !== "ok") {
    throw new Error(`Slack API error: ${res.status} - ${text}`);
  }
}

postReleaseToSlack(release).catch(err => {
  console.error("❌ Failed to post release to Slack:", err);
  process.exit(1);
});

