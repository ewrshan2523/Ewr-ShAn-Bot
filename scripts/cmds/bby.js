const axios = require("axios");

const getAPIBase = async () => {
  const { data } = await axios.get(
    "https://raw.githubusercontent.com/EwrShAn25/ShAn.s-Api/refs/heads/main/Api.json"
  );
  return data.shan;
};

const sendMessage = (api, threadID, message, messageID) =>
  api.sendMessage(message, threadID, messageID);

const cError = (api, threadID, messageID) =>
  sendMessage(api, threadID, "error🦆💨", messageID);

const teachBot = async (api, threadID, messageID, senderID, teachText) => {
  const [ask, answers] = teachText.split(" - ").map(text => text.trim());
  if (!ask || !answers) {
    return sendMessage(api, threadID, "Invalid format. Use: {pn} teach <ask> - <answer1, answer2, ...>", messageID);
  }

  const answerArray = answers.split(",").map(ans => ans.trim()).filter(ans => ans !== "");

  try {
    const apiBase = await getAPIBase();
    if (!apiBase) return cError(api, threadID, messageID);

    const res = await axios.get(
      `${apiBase}/ShAn/teach?ask=${encodeURIComponent(ask)}&ans=${encodeURIComponent(answerArray.join(","))}&uid=${senderID}`
    );

    let responseMsg;
    
    switch (res.data?.status) {
      case "Already Exists":
        responseMsg = "🎀Answers have already been taught!";
        break;
        
      case "Partial Success":
        responseMsg = `🔄 Added new answers to existing question!\n` +
                     `📖 Question: ${res.data.ask}\n` +
                     `➕ New Answers: ${res.data.message.replace('Added new answers: ', '')}\n` +
                     `🏆 Your Total Teachings: ${res.data.userStats.totalTeachings}`;
        break;
        
      case "Success":
        responseMsg = `✅ Successfully taught new question!\n` +
                     `📖 Question: ${res.data.ask}\n` +
                     `📝 Answers: ${answerArray.join(", ")}\n` +
                     `🏆 Your Total Teachings: ${res.data.userStats.totalTeachings}`;
        break;
        
      default:
        responseMsg = res.data?.message || "❌ Teaching failed.";
    }

    return sendMessage(api, threadID, responseMsg, messageID);
    
  } catch (error) {
    console.error('Teaching error:', error);
    return cError(api, threadID, messageID);
  }
};

const talkWithBot = async (api, threadID, messageID, senderID, input) => {
  try {
    const apiBase = await getAPIBase();
    if (!apiBase) return cError(api, threadID, messageID);

    const res = await axios.get(
      `${apiBase}/ShAn/bby?text=${encodeURIComponent(input)}&uid=${senderID}&font=2`
    );

    const reply = res.data?.text || "Please teach me this sentence!🦆💨";
    const react = res.data.react || "";

    return api.sendMessage(reply + react, threadID, (error, info) => {
      if (error) return cError(api, threadID, messageID);
      if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
      global.GoatBot.onReply.set(info.messageID, {
        commandName: module.exports.config.name,
        type: "reply",
        author: senderID,
        msg: reply,
      });
    }, messageID);
  } catch {
    return cError(api, threadID, messageID);
  }
};

const botMsgInfo = async (api, threadID, messageID, senderID, input) => {
  try {
    const apiBase = await getAPIBase();
    if (!apiBase) return cError(api, threadID, messageID);

    const res = await axios.get(
      `${apiBase}/ShAn/msg?ask=${encodeURIComponent(input)}&uid=${senderID}`
    );

    if (!res.data || res.data.status !== "Success" || !Array.isArray(res.data.messages) || res.data.messages.length === 0) {
      return sendMessage(api, threadID, "No matching messages found!🦆💨", messageID);
    }

    const askText = `📜 Ask: ${res.data.ask}\n\n`;
    const answers = res.data.messages.map(msg => `🎀 [${msg.index}] ${msg.ans}`).join("\n");

    return sendMessage(api, threadID, `${askText}${answers}`, messageID);
  } catch {
    return cError(api, threadID, messageID);
  }
};

const deleteMessage = async (api, threadID, messageID, senderID, input) => {
  try {
    const parts = input.split(" - ").map(part => part.trim());

    if (!parts[0]) {
      return sendMessage(api, threadID, "Invalid format. Use: {pn} delete <text> OR {pn} delete <text> - <index>", messageID);
    }

    const text = parts[0];
    const index = parts[1] && !isNaN(parts[1]) ? parseInt(parts[1], 10) : null;

    const apiBase = await getAPIBase();
    if (!apiBase) return cError(api, threadID, messageID);

    let url = `${apiBase}/ShAn/delete?text=${encodeURIComponent(text)}&uid=${senderID}`;
    if (index !== null) url += `&index=${index}`;

    const res = await axios.get(url);

    return sendMessage(api, threadID, res.data?.status === "Success"
      ? `✅ Successfully deleted ${index !== null ? `answer at index ${index} of` : "all answers related to"}: ${text}`
      : res.data?.message || "❌ Failed to delete the message!", messageID);
  } catch {
    return cError(api, threadID, messageID);
  }
};

const editMessage = async (api, threadID, messageID, senderID, input) => {
  try {
    const parts = input.split(" - ").map(part => part.trim());

    if (parts.length < 2) {
      return sendMessage(api, threadID, "Invalid format. Use:\n1. {pn} edit <ask> - <newAsk>\n2. {pn} edit <ask> - <index> - <newAnswer>", messageID);
    }

    const [ask, newAskOrIndex, newAns] = parts;
    const apiBase = await getAPIBase();
    if (!apiBase) return cError(api, threadID, messageID);

    if (!isNaN(newAskOrIndex) && newAns) {
      const index = parseInt(newAskOrIndex, 10);

      const res = await axios.get(
        `${apiBase}/ShAn/edit?ask=${encodeURIComponent(ask)}&index=${index}&newAns=${encodeURIComponent(newAns)}&uid=${senderID}`
      );

      return sendMessage(api, threadID, res.data?.status === "Success"
        ? `✅ Successfully updated answer at index ${index} to: ${newAns}`
        : res.data?.message || "❌ Failed to update the answer!", messageID);
    } else {
      const res = await axios.get(
        `${apiBase}/ShAn/edit?ask=${encodeURIComponent(ask)}&newAsk=${encodeURIComponent(newAskOrIndex)}&uid=${senderID}`
      );

      return sendMessage(api, threadID, res.data?.status === "Success"
        ? `✅ Successfully updated question to: ${newAskOrIndex}`
        : res.data?.message || "❌ Failed to update the question!", messageID);
    }
  } catch {
    return cError(api, threadID, messageID);
  }
};

module.exports.config = {
  name: "bby",
  aliases: ["baby","bbu", "faiza", "shan"],
  version: "1.6.9",
  author: "𝗦𝗵𝗔𝗻",
  role: 0,
  description: {
    en: "Talk with the bot or teach it new responses"
  },
  category: "𝗧𝗔𝗟𝗞",
  countDown: 3,
  guide: {
    en: `{p}{n} <text> - Ask the bot something\n{p}ShAn teach <ask> - <answer> - Teach the bot a new response\n\nExamples:\n1. {p}{n} Hello\n2. {p}ShAn teach hi - hello\n3. {p}ShAn delete <text> - Delete all answers related to text\n4. {p}ShAn delete <text> - <index> - Delete specific answer at index\n5. {p}ShAn edit <Ask> - <New Ask> to update the ask query\n6. {p}ShAn edit <ask> - <index> - <new ans> update specific answer at index`,
  },
};

module.exports.onStart = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;
  if (args.length === 0) {
    return sendMessage(api, threadID, "Please provide text or teach the bot!", messageID);
  }

  const input = args.join(" ").trim();
  const [command, ...rest] = input.split(" ");

  switch (command.toLowerCase()) {
    case "teach":
      return teachBot(api, threadID, messageID, senderID, rest.join(" ").trim());
    case "msg":
      return botMsgInfo(api, threadID, messageID, senderID, rest.join(" ").trim());
    case "edit":
      return editMessage(api, threadID, messageID, senderID, rest.join(" ").trim());
    case "delete":
    case "remove":
      return deleteMessage(api, threadID, messageID, senderID, rest.join(" ").trim());
    default:
      return talkWithBot(api, threadID, messageID, senderID, input);
  }
};

module.exports.onChat = async ({ api, event }) => {
  const { threadID, messageID, body, senderID } = event;

  const cMessages = ["🎀 Hello bby!", "🎀 Hi there!", "🎀 Hey! How can I help?😝", ];
  const userInput = body.toLowerCase().trim();

  const keywords = ["bby", "shan", "baby", "bot", "বট", "robot"];

  if (keywords.some((keyword) => userInput.startsWith(keyword))) {
    const isQuestion = userInput.split(" ").length > 1;
    if (isQuestion) {
      const question = userInput.slice(userInput.indexOf(" ") + 1).trim();

      try {
        const res = await axios.get(
          `${await getAPIBase()}/ShAn/bby?text=${encodeURIComponent(question)}&uid=${senderID}&font=2`
        );
        const replyMsg = res.data?.text || "Please teach me this sentence!🦆💨";
        const react = res.data.react || "";

        return api.sendMessage(replyMsg + react, threadID, (error, info) => {
          if (!error) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              type: "reply",
              author: senderID,
              replyMsg
            });
          }
        }, messageID);
      } catch (error) {
        return api.sendMessage("error🦆💨", threadID, messageID);
      }
    } else {
      const rMsg = cMessages[Math.floor(Math.random() * cMessages.length)];
      return api.sendMessage(rMsg, threadID, (error, info) => {
          if (!error) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              type: "reply",
              author: senderID,
            });
          }
        }, messageID);
    }
  }
};

module.exports.onReply = async ({ api, event, Reply }) => {
  const { threadID, messageID, senderID, body } = event;
  return talkWithBot(api, threadID, messageID, senderID, body);
};
