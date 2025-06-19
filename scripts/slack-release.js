const fetch = require('node-fetch');

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const repo = process.env.GITHUB_REPOSITORY;
const tag = process.env.RELEASE_TAG;
const url = process.env.RELEASE_URL;
const bodyRaw = process.env.RELEASE_BODY || '';
const title = process.env.RELEASE_TITLE || tag;

// Si la release est un hotfix, ne rien faire
if (/hotfix/i.test(title) || /hotfix/i.test(bodyRaw)) {
  console.log("Release ignored due to 'hotfix' keyword.");
  process.exit(0);
}

// Facultatif : map personnalisé pour rediriger certaines PR vers des liens spécifiques
const customPRLinks = {
  911: 'https://app.checkmarble.com/sign-in',
  912: 'https://app.checkmarble.com/dashboard',
};

function convertPRLinks(text) {
  return text.replace(/#(\d+)/g, (_, num) => {
    let target = customPRLinks[num];
    if (!target || typeof target !== 'string') {
      target = `https://github.com/${repo}/pull/${num}`;
    }
    return `<${target}|#${num}>`;
  });
}

function convertHeaders(text) {
  return text
    .replace(/^### (.*)$/gm, '*$1*')
    .replace(/^## (.*)$/gm, '*$1*')
    .replace(/^# (.*)$/gm, '*$1*');
}

function convertLists(text) {
  return text.replace(/^- /gm, '• ');
}

function extractImages(text) {
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  const urls = [];
  let cleanedText = text.replace(imgRegex, (_, url) => {
    urls.push(url);
    return '';
  });
  return { cleanedText, urls };
}

// Format du message Slack
const { cleanedText, urls } = extractImages(bodyRaw);
const body = [convertHeaders, convertLists, convertPRLinks].reduce(
  (text, fn) => fn(text),
  cleanedText.trim()
);

const messageBlocks = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `:rocket: *New release published!*\n*<https://github.com/${repo}|${repo}>*\n:arrow_right: *${title}*\n:link: <${url}>`,
    },
  },
  {
    type: 'divider',
  },
];

if (body) {
  messageBlocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: body,
    },
  });
}

urls.forEach((imgUrl) => {
  messageBlocks.push({
    type: 'image',
    image_url: imgUrl,
    alt_text: 'Release image',
  });
});

// Envoi à Slack
fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ blocks: messageBlocks }),
})
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Slack API error: ${res.statusText}`);
    }
    return res.text();
  })
  .then((text) => {
    console.log('Message sent to Slack:', text);
  })
  .catch((err) => {
    console.error('Error sending to Slack:', err);
    process.exit(1);
  });
