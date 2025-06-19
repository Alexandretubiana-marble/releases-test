const fs = require("fs");

const releaseTitle = process.env.RELEASE_TITLE;
const releaseUrl = process.env.RELEASE_URL;
const releaseBody = process.env.RELEASE_BODY;
const repo = process.env.GITHUB_REPOSITORY;

function linkifyPRs(text) {
  // Ne modifie pas les #123 déjà dans des liens [#123](url)
  return text.replace(/(^|[^)\]])#(\d+)/g, (match, prefix, prNumber) => {
    return `${prefix}<https://github.com/${repo}/pull/${prNumber}|#${prNumber}>`;
  });
}

function convertMarkdownToSlack(text) {
  return text
    .replace(/^### (.*)/gm, "*$1*")
    .replace(/^## (.*)/gm, "*$1*")
    .replace(/^# (.*)/gm, "*$1*")
    .replace(/^[-*] (.*)/gm, "• $1");
}

function extractBlocksFromMarkdown(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  lines.forEach(line => {
    const imageMatch = line.match(/!\[[^\]]*\]\((.*?)\)/);
    if (imageMatch) {
      blocks.push({
        type: "image",
        image_url: imageMatch[1],
        alt_text: "Release image"
        // Slack ne permet pas de forcer la taille, il faut que l’image soit déjà redimensionnée
      });
    } else if (line.trim() !== "") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: linkifyPRs(convertMarkdownToSlack(line))
        }
      });
    }
  });

  return blocks;
}

const blocks = [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `:rocket: *New release:* <${releaseUrl}|${releaseTitle}>`
    }
  },
  ...extractBlocksFromMarkdown(releaseBody)
];

fs.writeFileSync("slack-payload.json", JSON.stringify({ blocks }, null, 2));
