name: Post Release Notes to Slack

on:
  release:
    types: [published]

jobs:
  post-release:
    runs-on: ubuntu-latest
    steps:
      - name: Post release notes to Slack
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          RELEASE_TAG: ${{ github.event.release.tag_name }}
          RELEASE_URL: ${{ github.event.release.html_url }}
          RELEASE_BODY: ${{ github.event.release.body }}
        run: |
          node -e "
          const body = process.env.RELEASE_BODY || '';
          const repo = process.env.GITHUB_REPOSITORY;
          const tag = process.env.RELEASE_TAG;
          const url = process.env.RELEASE_URL;
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;

          // Fonction pour transformer titres markdown (#, ##, ###) en gras Slack
          function convertHeaders(line) {
            return line
              .replace(/^###\s*(.*)/, '*$1*')
              .replace(/^##\s*(.*)/, '*$1*')
              .replace(/^#\s*(.*)/, '*$1*');
          }

          // Remplacer listes - par •
          function convertLists(line) {
            return line.replace(/^-\s+/, '• ');
          }

          // Remplacer les liens PR #123 par hyperliens avec la bonne URL
          // Ex ici : pr# -> https://github.com/<repo>/pull/<num>
          // Pour custom url, modifie cette fonction.
          function linkifyPRs(text) {
            const customPRLinks = {
              '911': 'https://app.checkmarble.com/sign-in',
              // Ajoute ici d'autres mappings PR->URL si besoin
            };

            return text.replace(/#(\d+)/g, (match, num) => {
              const target = customPRLinks[num] || `https://github.com/${repo}/pull/${num}`;
              return `<${target}|#${num}>`;
            });
          }

          // Limite taille images en ajoutant params (exemple pour GitHub assets)
          function resizeImage(url) {
            // Modifie selon ton hébergeur d'images
            // Pour GitHub assets : on peut pas facilement forcer la taille via URL
            // Sinon tu peux utiliser un proxy ou hébergement qui gère ça.
            return url;
          }

          // Parse body ligne par ligne et construit blocks Slack
          const blocks = [];

          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:rocket: *Nouvelle release publiée !*\n:arrow_right: *${repo}*\n:arrow_right: *${tag}*\n:link: ${url}`
            }
          });

          blocks.push({ type: 'divider' });

          const lines = body.split(/\r?\n/);

          for (const lineOrig of lines) {
            const line = lineOrig.trim();
            if (line.length === 0) continue;

            // Cherche image markdown ![alt](url)
            const mdImage = line.match(/!\[[^\]]*\]\((.*?)\)/);
            // Cherche image html <img src="url" />
            const htmlImage = line.match(/<img\s+src=['\"]([^'\"]+)['\"]\s*\/?>/i);

            if (mdImage) {
              blocks.push({
                type: 'image',
                image_url: resizeImage(mdImage[1]),
                alt_text: 'Release image'
              });
            } else if (htmlImage) {
              blocks.push({
                type: 'image',
                image_url: resizeImage(htmlImage[1]),
                alt_text: 'Release image'
              });
            } else {
              // Transforme le texte pour Slack
              let text = line;
              text = convertHeaders(text);
              text = convertLists(text);
              text = linkifyPRs(text);

              blocks.push({
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: text
                }
              });
            }
          }

          // Envoi vers Slack
          const https = require('https');
          const urlObj = new URL(webhookUrl);

          const postData = JSON.stringify({ blocks });

          const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode >= 400) {
                console.error('Slack API error:', res.statusCode, data);
                process.exit(1);
              } else {
                console.log('Message posted to Slack');
              }
            });
          });

          req.on('error', (e) => {
            console.error('Request error:', e);
            process.exit(1);
          });

          req.write(postData);
          req.end();
          "
