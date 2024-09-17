const { Client, GatewayIntentBits } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

// Discord 클라이언트를 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Anthropic 클라이언트를 생성
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// 환경 변수에서 필요한 값들을 가져옴
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS.split(',');
const ALLOWED_SERVER_ID = process.env.ALLOWED_SERVER_ID;

// '냥!' 모드의 상태를 저장하는 변수입니다. 기본값은 true(활성화)
let isNyanModeEnabled = true;

// 현재 처리 중인 요청이 있는지 확인하는 변수
let isProcessing = false;

// 대기 중인 요청을 저장하는 큐
const requestQueue = [];

/**
 * Claude API를 호출하고 응답을 수정하는 함수
 * @param {string} message - 사용자의 입력 메시지
 * @returns {string} - Claude API의 응답 (필요시 '냥!' 모드 적용)
 */
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

/**
 * 모든 서술어 끝에 '냥!'을 추가하는 함수
 * @param {string} text - 원본 텍스트
 * @returns {string} - '냥!'이 추가된 텍스트
 */
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

/**
 * 요청을 처리하는 함수
 * @param {Object} message - Discord 메시지 객체
 * @param {string} query - 사용자의 질문
 */
async function processRequest(message, query) {
  isProcessing = true;
  try {
    const response = await callClaudeAPI(query);
    await message.reply(response);
  } catch (error) {
    console.error('요청 처리 중 오류 발생:', error);
    await message.reply(isNyanModeEnabled
      ? '죄송하다냥! 요청을 처리하는 중에 오류가 발생했다냥!'
      : '죄송합니다, 요청을 처리하는 중에 오류가 발생했습니다.');
  } finally {
    isProcessing = false;
  }

  if (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    processRequest(nextRequest.message, nextRequest.query);
  }
}

// 봇이 준비되었을 때 실행되는 이벤트 핸들러
client.once('ready', () => {
  console.log(`${client.user.tag}으로 로그인했습니다!`);
  
  const allowedServer = client.guilds.cache.get(ALLOWED_SERVER_ID);
  if (!allowedServer) {
    console.error('허용된 서버를 찾을 수 없습니다. 봇을 종료합니다.');
    client.destroy();
    process.exit(1);
  }
  
  console.log(`허용된 서버 "${allowedServer.name}"에서 작동 중입니다.`);
});

// 메시지가 생성되었을 때 실행되는 이벤트 핸들러
client.on('messageCreate', async (message) => {
  if (message.guild.id !== ALLOWED_SERVER_ID) return;
  if (message.author.bot) return;
  if (!ALLOWED_USER_IDS.includes(message.author.id)) return;

  if (message.content === '!nyanmode on') {
    isNyanModeEnabled = true;
    await message.reply('냥 모드가 활성화되었다냥!');
    return;
  } 
  
  if (message.content === '!nyanmode off') {
    isNyanModeEnabled = false;
    await message.reply('냥 모드가 비활성화되었습니다.');
    return;
  }

  if (message.content.startsWith('!claude')) {
    const query = message.content.slice(7).trim();
    if (isProcessing) {
      requestQueue.push({ message, query });
      await message.reply(isNyanModeEnabled
        ? '지금은 너무 바쁘다냥! 조금 있다가 답변해주겠다냥!'
        : '현재 다른 질문을 처리 중입니다. 잠시 후에 답변 드리겠습니다.');
    } else {
      processRequest(message, query);
    }
  }
});

// Discord에 봇 로그인
client.login(DISCORD_BOT_TOKEN);