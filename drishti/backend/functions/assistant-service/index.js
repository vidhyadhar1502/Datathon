/**
 * DRISHTI — assistant-service
 * Advanced I/O Catalyst Function: the conversational crime assistant.
 * Takes free text (voice queries are converted to text client-side before
 * reaching this endpoint — see docs/assistant/README.md), classifies
 * intent, extracts entities/case references, and dispatches to
 * data-service / analytics-service / network-service, then composes a
 * short natural-language reply.
 *
 * Env var required:
 *   INTERNAL_BASE_URL — the project's function base, e.g.
 *     https://<project-domain>/server
 *   (each backing function is then reached at INTERNAL_BASE_URL/<fn-name>)
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const axios = require('axios');
const { INTENTS, classifyIntent, extractCaseReference, extractEntities } = require('./intentRouter');

const app = express();
app.use(express.json());

function internalUrl(path) {
  const base = process.env.INTERNAL_BASE_URL || '/server';
  return `${base}${path}`;
}

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
}

/**
 * POST /assistant/query
 * Body: { text: "What's the status of case 104430006202600001?" }
 */
app.post('/assistant/query', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: true, message: 'text is required' });
    }

    const catalystApp = catalyst.initialize(req);
    const zia = catalystApp.zia();

    const intent = classifyIntent(text);
    const caseRef = extractCaseReference(text);
    const entities = await extractEntities(zia, text);

    let reply;
    let data = null;

    switch (intent) {
      case INTENTS.CASE_LOOKUP: {
        if (!caseRef) {
          reply = "I can look up a case if you give me a case ID or the 18-digit crime number.";
          break;
        }
        if (caseRef.type === 'caseId') {
          const response = await axios.get(internalUrl(`/data-service/cases/${caseRef.value}`));
          data = response.data;
          const status = data.caseMaster && data.caseMaster.CaseStatusID;
          reply = `Case ${caseRef.value}: status ID ${status}. ${data.accused?.length || 0} accused, ${data.complainants?.length || 0} complainant(s) on file.`;
        } else {
          reply = `I found crime number ${caseRef.value} in your message, but looking up by crime number directly isn't wired up yet — try the case ID instead.`;
        }
        break;
      }

      case INTENTS.HOTSPOT: {
        const response = await axios.get(internalUrl('/analytics-service/hotspots'));
        data = response.data;
        const topCell = (data.hotspots || []).sort((a, b) => b.count - a.count)[0];
        reply = topCell
          ? `The busiest area right now is around (${topCell.latitude}, ${topCell.longitude}) with ${topCell.count} case(s). See the map for the full picture.`
          : "I don't have enough case location data yet to identify a hotspot.";
        break;
      }

      case INTENTS.TREND: {
        const response = await axios.get(internalUrl('/analytics-service/trends'));
        data = response.data;
        const months = Object.keys(data.trends || {}).sort();
        reply = months.length
          ? `I have trend data for ${months.length} month(s), most recently ${months[months.length - 1]}. Check the trends chart for the full breakdown by crime type.`
          : "I don't have enough registered cases yet to show a trend.";
        break;
      }

      case INTENTS.NETWORK: {
        if (!caseRef || caseRef.type !== 'caseId') {
          reply = "Tell me which case or accused person you want the network for, e.g. \"connections for case 12\".";
          break;
        }
        const response = await axios.get(internalUrl(`/network-service/network/case/${caseRef.value}`));
        data = response.data;
        reply = `Case ${caseRef.value} has ${data.nodes?.length || 0} people and ${data.edges?.length || 0} known connections in the network graph.`;
        break;
      }

      default:
        reply = "I can help with case lookups, crime hotspots, trends, or criminal network connections — try asking about one of those.";
    }

    res.status(200).json({ reply, intent, entities, data });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = app;
