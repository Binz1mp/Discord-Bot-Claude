// 필요한 모듈들을 불러옵니다.
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config(); // 환경 변수를 불러오기 위해 dotenv를 사용합니다.

// Discord 클라이언트를 초기화합니다. 필요한 인텐트를 설정합니다.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Anthropic API 클라이언트를 초기화합니다.
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// 환경 변수에서 필요한 설정값들을 가져옵니다.
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS.split(',');
const ALLOWED_SERVER_ID = process.env.ALLOWED_SERVER_ID;

// 전역 변수 설정
let isNyanModeEnabled = true; // '냥' 모드 활성화 여부
let isProcessing = false; // 현재 요청 처리 중인지 여부
const requestQueue = []; // 대기 중인 요청을 저장할 큐

// Claude API를 호출하는 함수
async function callClaudeAPI(message) {
  try {
    // Claude API에 메시지를 보내고 응답을 받습니다.
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{ role: "user", content: message }],
    });
    
    let responseText = response.content[0].text.trim();
    
    // '냥' 모드가 활성화되어 있으면 응답에 '냥'을 추가합니다.
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

// 문장 끝에 '냥'을 추가하는 함수
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

// 사용자 요청을 처리하는 함수
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

  // 대기 중인 요청이 있으면 다음 요청을 처리합니다.
  if (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    processRequest(nextRequest.interaction, nextRequest.query);
  }
}

// 봇이 준비되었을 때 실행되는 이벤트 핸들러
client.once('ready', async () => {
  console.log(`${client.user.tag}으로 로그인했습니다!`);
  
  // 허용된 서버를 확인합니다.
  const allowedServer = client.guilds.cache.get(ALLOWED_SERVER_ID);
  if (!allowedServer) {
    console.error('허용된 서버를 찾을 수 없습니다. 봇을 종료합니다.');
    client.destroy();
    process.exit(1);
  }
  
  console.log(`허용된 서버 "${allowedServer.name}"에서 작동 중입니다.`);

  // 슬래시 명령어를 정의합니다.
  const commands = [
    new SlashCommandBuilder()
      .setName('nbz')
      .setDescription('Claude AI에게 질문하기')
      .addStringOption(option => 
        option.setName('할 말')
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

  // Discord API에 슬래시 명령어를 등록합니다.
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

// 상호작용(명령어 사용 등) 이벤트 핸들러
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.guildId !== ALLOWED_SERVER_ID) return;
  if (!ALLOWED_USER_IDS.includes(interaction.user.id)) return;

  const { commandName } = interaction;

  if (commandName === 'nbz') {
    const query = interaction.options.getString('할 말');
    if (isProcessing) {
      // 이미 처리 중인 요청이 있으면 큐에 추가합니다.
      requestQueue.push({ interaction, query });
      await interaction.reply({
        content: isNyanModeEnabled
          ? '지금은 너무 바쁘다냥! 조금 있다가 답변해주겠다냥!'
          : '현재 다른 질문을 처리 중입니다. 잠시 후에 답변 드리겠습니다.',
        ephemeral: true
      });
    } else {
      // 바로 처리할 수 있으면 처리합니다.
      processRequest(interaction, query);
    }
  } else if (commandName === 'nyanmode') {
    // '냥' 모드 설정을 변경합니다.
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

// Discord에 봇을 연결합니다.
client.login(DISCORD_BOT_TOKEN);
