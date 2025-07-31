const fetch = require('node-fetch');

// Supprimer les liens GitHub du texte
function removeGitHubLinks(text, repo) {
  const githubRegex = new RegExp(`https?://github\\.com/${repo.replace('/', '\\/')}/[\\w\\-./()#]+`, 'g');
  return text.replace(githubRegex, '');
}

// Convertir Markdown vers Slack : titres, puces, liens, #PR, images
function formatMarkdownText(text, prBaseUrl, repo) {
  // Supprimer les liens GitHub sauf le principal
  text = removeGitHubLinks(text, repo);

  // Convertir les titres Markdown en gras
  text = text.replace(/^### (.*)$/gm, '*$1*');
  text = text.replace(/^## (.*)$/gm, '*$1*');
  text = text.replace(/^# (.*)$/gm, '*$1*');

  // Convertir les puces
  text = text.replace(/^- /gm, '• ');

  // Lien vers PR GitHub (type #123)
  text = text.replace(/#(\d+)/g, (match, p1) => {
    const url = `${prBaseUrl}/pull/${p1}`;
    return `<${url}|#${p1}>`;
  });

  // Lien Markdown [texte](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<$2|$1>');

  return text;
}

// Convertit le texte markdown (avec images) en blocs Slack intercalés
function parseMarkdownToSlackBlocks(markdownText, prBaseUrl, repo) {
  const blocks = [];

  // Gestion des balises <img ...>
  const imgTagRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
  // Gestion des images markdown ![alt](url)
  const markdownImgRegex = /!\[(.*?)\]\((.*?)\)/g;

  // Fusionner les deux
  const combinedRegex = new RegExp(`${imgTagRegex.source}|${markdownImgRegex.source}`, 'gi');

  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(markdownText)) !== null) {
    const index = match.index;

    // Texte avant l'image
    if (index > lastIndex) {
      let segment = markdownText.slice(lastIndex, index).trim();
      if (segment) {
        const formatted = formatMarkdownText(segment, prBaseUrl, repo);
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: formatted,
          },
        });
      }
    }

    // Image (markdown ou HTML)
    const url = match[1] || match[3];
    const alt = match[2] || match[4] || 'Image';
    if (url) {
      blocks.push({
        type: "image",
        image_url: url,
        alt_text: alt,
      });
    }

    lastIndex = combinedRegex.lastIndex;
  }

  // Texte après la dernière image
  if (lastIndex < markdownText.length) {
    let segment = markdownText.slice(lastIndex).trim();
    if (segment) {
      const formatted = formatMarkdownText(segment, prBaseUrl, repo);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: formatted,
        },
      });
    }
  }

  return blocks;
}

async function postReleaseToSlack() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const releaseUrl = process.env.RELEASE_URL;
  const releaseTag = process.env.RELEASE_TAG;
  const releaseName = process.env.RELEASE_NAME || releaseTag;
  const releaseBody = process.env.RELEASE_BODY;

  const prBaseUrl = `https://github.com/${repo}`;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚀 New release: ${releaseName}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔗 <${releaseUrl}|View on GitHub>`,
      },
    },
    {
      type: "divider",
    },
    ...parseMarkdownToSlackBlocks(releaseBody, prBaseUrl, repo),
  ];

  const payload = { blocks };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Slack API error: ${res.status} - ${errorText}`);
    }

    console.log("✅ Slack message sent successfully.");
  } catch (err) {
    console.error("❌ Failed to post release to Slack:", err);
    process.exit(1);
  }
}

postReleaseToSlack();
