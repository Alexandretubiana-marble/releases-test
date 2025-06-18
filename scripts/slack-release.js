const fs = require("fs");

const releaseTitle = process.env.RELEASE_TITLE;
const releaseUrl = process.env.RELEASE_URL;
const releaseBody = process.env.RELEASE_BODY;

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
      });
    } else if (line.trim() !== "") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: line
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

const payload = JSON.stringify({ blocks }, null, 2);
fs.writeFileSync("slack-payload.json", payload);
