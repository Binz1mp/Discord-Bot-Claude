const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS.split(',');
const ALLOWED_SERVER_ID = process.env.ALLOWED_SERVER_ID;

let isNyanModeEnabled = true;
let isProcessing = false;
const requestQueue = [];

async function callClaudeAPI(message) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{ role: "user", content: message }],
    });
    
    let responseText = response.content[0].text.trim();
    
    if (isNyanModeEnabled) {
      responseText = addNyangToPredicate(responseText);
    }

    return responseText;
  } catch (error) {
    console.error('Claude API 호출 중 오류 발생:', error);
    return isNyanModeEnabled 
      ? '죄송하다냥! 요청을 처리하는 동안 오류가 발생했다냥!' 
      : '죄송합니다. 요청을 처리하는 동안 오류가 발생했습니다.';
  }
}

function addNyangToPredicate(text) {
  const sentences = text.split(/([.!?])\s*/).filter(Boolean);
  
  return sentences.map((sentence, index, array) => {
    if (sentence.match(/[.!?]/)) {
      return sentence.replace(/([.!?])$/, ' 냥!$1');
    } 
    else if (index + 1 < array.length && array[index + 1].match(/[.!?]/)) {
      return sentence;
    } 
    else {
      return sentence + ' 냥!';
    }
  }).join(' ');
}

async function processRequest(interaction, query) {
  isProcessing = true;
  await interaction.deferReply();
  try {
    const response = await callClaudeAPI(query);
    await interaction.editReply(response);
  } catch (error) {
    console.error('요청 처리 중 오류 발생:', error);
    await interaction.editReply(isNyanModeEnabled
      ? '죄송하다냥! 요청을 처리하는 중에 오류가 발생했다냥!'
      : '죄송합니다, 요청을 처리하는 중에 오류가 발생했습니다.');
  } finally {
    isProcessing = false;
  }

  if (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    processRequest(nextRequest.interaction, nextRequest.query);
  }
}

client.once('ready', async () => {
  console.log(`${client.user.tag}으로 로그인했습니다!`);
  
  const allowedServer = client.guilds.cache.get(ALLOWED_SERVER_ID);
  if (!allowedServer) {
    console.error('허용된 서버를 찾을 수 없습니다. 봇을 종료합니다.');
    client.destroy();
    process.exit(1);
  }
  
  console.log(`허용된 서버 "${allowedServer.name}"에서 작동 중입니다.`);

  // 슬래시 명령어 등록
  const commands = [
    new SlashCommandBuilder()
      .setName('nbz')
      .setDescription('Claude AI에게 질문하기')
      .addStringOption(option => 
        option.setName('query')
          .setDescription('Claude AI에게 물어볼 질문')
          .setRequired(true)),
    new SlashCommandBuilder()
      .setName('nyanmode')
      .setDescription('냥 모드 설정')
      .addStringOption(option =>
        option.setName('status')
          .setDescription('냥 모드를 켜거나 끕니다')
          .setRequired(true)
          .addChoices(
            { name: '켜기', value: 'on' },
            { name: '끄기', value: 'off' }
          ))
  ];

  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, ALLOWED_SERVER_ID),
      { body: commands },
    );
    console.log('슬래시 명령어가 성공적으로 등록되었습니다!');
  } catch (error) {
    console.error('슬래시 명령어 등록 중 오류 발생:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.guildId !== ALLOWED_SERVER_ID) return;
  if (!ALLOWED_USER_IDS.includes(interaction.user.id)) return;

  const { commandName } = interaction;

  if (commandName === 'nbz') {
    const query = interaction.options.getString('query');
    if (isProcessing) {
      requestQueue.push({ interaction, query });
      await interaction.reply({
        content: isNyanModeEnabled
          ? '지금은 너무 바쁘다냥! 조금 있다가 답변해주겠다냥!'
          : '현재 다른 질문을 처리 중입니다. 잠시 후에 답변 드리겠습니다.',
        ephemeral: true
      });
    } else {
      processRequest(interaction, query);
    }
  } else if (commandName === 'nyanmode') {
    const status = interaction.options.getString('status');
    isNyanModeEnabled = status === 'on';
    await interaction.reply({
      content: isNyanModeEnabled
        ? '냥 모드가 활성화되었다냥!'
        : '냥 모드가 비활성화되었습니다.',
      ephemeral: true
    });
  }
});

client.login(DISCORD_BOT_TOKEN);