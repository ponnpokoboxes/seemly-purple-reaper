const http = require("http");
const querystring = require("querystring");
const fs = require("node:fs");
const path = require("node:path");
const fetch = require("node-fetch");
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
  WebhookClient,
  PermissionsBitField,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
} = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Reaction, Partials.Message],
});
client.commands = new Collection();

http
  .createServer(function (req, res) {
    if (req.method == "POST") {
      var data = "";
      req.on("data", function (chunk) {
        data += chunk;
      });
      req.on("end", function () {
        if (!data) {
          console.log("No post data");
          res.end();
          return;
        }
        var dataObject = querystring.parse(data);
        console.log("post:" + dataObject.type);
        if (dataObject.type == "wake") {
          console.log("Woke up in post");
          res.end();
          return;
        }
        if (dataObject.type == "meiboAudit") {
          console.log("meiboAudit");
          meiboAudit_master(dataObject);
          res.end();
          return;
        }
        if (dataObject.type == "roleReplace") {
          console.log("roleReplace");
          meiboAudit_master(dataObject);
          res.end();
          return;
        }
        if (dataObject.type == "chSetting") {
          console.log("chSetting");
          chSetting(dataObject);
          res.end();
          return;
        }
        if (dataObject.type == "schEventCreating") {
          console.log("schEventCreating");
          createScheduledEvents(dataObject);
          res.end();
          return;
        }
        if (dataObject.type == "userCheck") {
          console.log("ponnpoko:" + dataObject.type);
          var whoIsHere = peopleInTheGuild(
            dataObject.guildID,
            dataObject.userID
          );
          var words = whoIsHere;
          res.end("うにょん" + words);
          return;
        }
        if (dataObject.type == "userCheck2") {
          console.log("ponnpoko:" + dataObject.type);
          var whoIsHere = peopleInTheGuild2(
            dataObject.guildID,
            dataObject.userID
          );
          var words = whoIsHere;
          res.end("うにょん" + words);
          return;
        }
        if (dataObject.type == "getMemberList") {
          console.log("getMemberList");
          memberListRetliever(dataObject);
          res.end();
          return;
        }
        if (dataObject.type == "finish") {
          console.log("ponnpoko:" + dataObject.type);
          let userId = String(dataObject.userID);
          sendDm(userId, dataObject.comment);
          res.end();
          return;
        }
        if (dataObject.type == "finish2") {
          console.log("darumasann:" + dataObject.type);
          let channelId = String(dataObject.userID);
          if (dataObject.options != null) {
            let options = JSON.parse(dataObject.options);
            if (options.ext == "ext") {
              sendMsgWithFrags(channelId, dataObject.comment, options);
            } else {
              sendMsgWithFrags(channelId, dataObject.comment, options);
            }
          } else {
            sendMsg(channelId, dataObject.comment);
          }
          res.end();
          return;
        }
        if (dataObject.type == "finish3") {
          console.log("darumasann:" + dataObject.type);
          let channelId = dataObject.userID,
            fieldTitle = dataObject.fieldTitle,
            text = dataObject.comment;
          if (dataObject.imageUrl === "null") {
            dataObject.imageUrl = null;
          }
          let image = dataObject.imageUrl,
            color = dataObject.embColor;
          sendEmbedMsg(channelId, fieldTitle, text, image, color); //channelId, fieldTitle, text, image, color
          res.end();
          return;
        }
        if (dataObject.type == "webhook1") {
          console.log("webhook1");
          webhook1(dataObject);
          res.end();
          return;
        }
        res.end();
      });
    } else if (req.method == "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(readyIs);
    }
  })
  .listen(process.env.PORT);

let readyIs = "NA";

client.once(Events.ClientReady, (c) => {
  console.log("Bot準備完了～");
  readyIs = "Discord Bot is active now\n";
  client.user.setPresence({ activities: [{ name: "ゲーム補佐" }] });
});

if (process.env.OPERAS == undefined) {
  console.log("OPERASが設定されていません。");
  process.exit(0);
}

client.login(process.env.OPERAS);

//投稿に基づく事務管理
async function meiboAudit_master(dataObject) {
  let res, channelID, recipientsArr, p1, partyArr, stampArr, answerArr;
  try {
    let obj = {
      type: dataObject.type,
      serverURL: dataObject.serverURL,
      channel1ID: String(dataObject.channel1ID),
      channel2ID: String(dataObject.channel2ID),
      channel3ID: String(dataObject.channel3ID),
      receive: String(dataObject.receive),
      reject: String(dataObject.reject),
    };
    /*console.log("obj", obj);*/
    channelID = String(obj.channel1ID);
    //recipientsArrを収集
    res = await meiboAudit_controller(channelID);
    (recipientsArr = res), (channelID = String(obj.channel2ID));
    if (obj.type == "meiboAudit") {
      //partyArrを収集
      p1 = {
        obj: obj,
        recipientsArr: recipientsArr,
        partyArr: await meiboAudit_controller(channelID),
      };
    } else if (obj.type == "roleReplace") {
      //memberArrを収集
      p1 = {
        obj: obj,
        recipientsArr: recipientsArr,
        memberArr: await memberListExtracter(
          String(obj.serverURL)
            .replace("https://discord.com/channels/", "")
            .replace("/", "")
        ),
        roleTypeArr: await roleListExtracter(
          String(obj.serverURL)
            .replace("https://discord.com/channels/", "")
            .replace("/", "")
        ),
      };
    } else {
      p1 = { obj: obj, recipientsArr: recipientsArr };
    }
    /*console.log("recipientsArr", recipientsArr, "\npartyArr", partyArr);*/
    //問い合わせ
    res = await meiboAudit_sender(obj, p1);
    console.log("res\n", res);
    if (String(res.result) === "OK") {
      //反応
      if (res.stampArr == undefined) {
        res["stampArr"] = [];
      }
      if (res.answerArr == undefined) {
        res["answerArr"] = [];
      }
      if (res.roleArr == undefined) {
        res["roleArr"] = [];
      }
      await meiboAudit_bulk(obj, res.stampArr, res.answerArr, res.roleArr);
    } else {
      console.warn("res.errorType", res.errorType);
    }
  } catch (e) {
    console.warn(e);
  }
  return res;
}

//メンバーを取得
async function memberListExtracter(guildID) {
  let guild = await client.guilds.cache.get(String(guildID));
  let currentList = await guild.members.fetch();
  let currentList2 = Array.from(currentList);
  return currentList2;
}

//ロールを取得
async function roleListExtracter(guildID) {
  let guild = await client.guilds.cache.get(String(guildID));
  let currentList = await guild.roles.fetch();
  let currentList2 = Array.from(currentList);
  console.log("currentList2", currentList2.length, currentList2[1][1].rawPosition);
  return currentList2;
}

//チャンネルに張られたメッセージリンクを✅付きのメッセージまでたどる
async function meiboAudit_controller(channelID) {
  //'serverURL''channel1ID''channel2ID'
  /*const guild = client.guilds.cache.get("1071288663884959854");*/ //試験用：1168349939525505054　実用：1071288663884959854
  const channel = client.channels.cache.get(String(channelID));
  let lastMessage,
    beforeMessage,
    befMes = [],
    messageIs = 0,
    emojiIs;
  let textArr = [];
  console.log("befMes.length", befMes.length);

  //終点を決める
  const response2 = await channel.messages.fetch({ limit: 1 });
  lastMessage = response2.first();
  befMes.push([
    lastMessage.id,
    lastMessage.content,
    lastMessage.author.id,
    lastMessage.createdAt.getTime(),
    lastMessage,
  ]);

  for (let i = Number(messageIs); i < 100; i++) {
    console.log("i", i);
    /*console.log("befMes", befMes[i]);*/
    messageIs = await channel.messages
      .fetch({
        before: befMes[i][0],
        limit: 1,
      })
      .then(async (messages) => {
        beforeMessage = messages.first();
        console.log("beforeMessage.id", beforeMessage.id);
        const messageReacted2 = await client.channels.cache
          .get(channelID.toString()) //試験用：1180401046825209937　実用：1175754185271169044
          .messages.fetch(befMes[i][0]);
        befMes.push([
          beforeMessage.id,
          beforeMessage.content,
          beforeMessage.author.id,
          beforeMessage.createdAt.getTime(),
          beforeMessage,
        ]);
        emojiIs = await myPromise2q(messageReacted2).then(async function (
          emojiIs2
        ) {
          console.log("emojiIs2", emojiIs2);
          if (emojiIs2.length > 0 && emojiIs2[0][0] == "✅") {
            console.log("emojiIs2[0][0]", emojiIs2[0][0]);
            i = 100;
          }
          return i;
        });
        return emojiIs;
      });
  }
  console.log("befMes Now length", befMes.length);
  let j = 0;
  for (let i = befMes.length - 1; i >= 0; i--) {
    //後ろから数えて最初の二つは入れないj < 2
    if (j >= 2) {
      //配列の成形。[[種別、メッセージID、文字列、投稿者ユーザーID、投稿日時]]
      textArr.push([
        "",
        String(befMes[i][0]),
        String(befMes[i][1]),
        String(befMes[i][2]),
        String(befMes[i][3]),
      ]);
    }
    j++;
  }
  console.log("textArr Now length", textArr.length);
  return textArr;
}

async function meiboAudit_sender(obj, p1) {
  let res;
  //問い合わせ→一括反応・一括送信
  try {
    //問い合わせ
    let req = JSON.stringify({
      p1: p1,
    });
    console.log("req", req);
    res = await fetching1(String(process.env.uri8), req);
    console.log("res.result", res.result);
  } catch (e) {
    console.warn(e);
  }
  return res;
}

//つづき。一括反応・一括送信をする。
async function meiboAudit_bulk(obj, stampArr, answerArr, roleArr) {
  let guildID, channelID, messageID, guild, channel, mes, member, str, option;
  let receive = String(obj.receive),
    reject = String(obj.reject);
  console.log("receive", receive, "reject", reject);
  //一括反応
  for (let i = 0; i < stampArr.length; i++) {
    try {
      channelID = String(stampArr[i][0]);
      messageID = String(stampArr[i][1]).replace(
        String(obj.serverURL) + String(stampArr[i][0]),
        ""
      );
      channel = client.channels.cache.get(String(channelID));
      mes = await channel.messages.fetch(messageID);
      if (String(stampArr[i][2]) == "受理") {
        stampArr[i][2] = String(receive);
      } else if (String(stampArr[i][2]) == "不受理") {
        stampArr[i][2] = String(reject);
      }
      mes.react(String(stampArr[i][2]));
    } catch (e) {
      console.warn(e);
    }
    await sleep(0.1 * 1000);
  }
  //一括送信
  for (let i = 0; i < answerArr.length; i++) {
    try {
      str = stirngLengthSplitter(
        String(answerArr[i][0]),
        String(answerArr[i][1]),
        1950
      );
      console.log("!OPTIONS!", answerArr[i].length > 2);
      if (answerArr[i].length > 2) {
          option = answerArr[i][2];
        } else {
          option = null;
        }
      for (let j = 0; j < str.length; j++) {
        sendMsgWithFrags(String(str[j][0]), String(str[j][2]), option);
        await sleep(0.1 * 1000);
      }
    } catch (e) {
      console.warn(e);
    }
  }
  //一括ロール
  guildID = String(obj.serverURL)
    .replace("https://discord.com/channels/", "")
    .replace("/", "");
  for (let i = 0; i < roleArr.length; i++) {
    try {
      guild = await client.guilds.fetch(String(guildID));
      member = await guild.members.cache.get(String(roleArr[i][2]));
      if (roleArr[i][0] == "remove") {
        await member.roles.remove(String(roleArr[i][1]));
      } else {
        await member.roles.add(String(roleArr[i][1]));
      }
    } catch (e) {
      console.warn(e);
    }
    await sleep(0.1 * 1000);
  }
}

//チャンネル権限設定
async function chSetting(obj) {
  let guildID = String(obj.serverURL)
      .replace("https://discord.com/channels/", "")
      .replace("/", ""),
    guild = await client.guilds.fetch(String(guildID)),
    channel = client.channels.cache.get(String(obj.channel1ID));
  obj.setting = JSON.parse(obj.setting);
  if (obj.setting[0].deny != undefined && obj.setting[0].deny.length > 0) {
    if (
      String(obj.setting[0].deny[0]) == "PermissionsBitField.Flags.ViewChannel"
    ) {
      obj.setting[0].deny[0] = PermissionsBitField.Flags.ViewChannel;
      console.log("$$$", obj.setting);
    }
    channel.permissionOverwrites.edit(obj.setting[0].id, {
      ViewChannel: false,
    }); //.set(obj.setting)
  } else if (
    obj.setting[0].allow != undefined &&
    obj.setting[0].allow.length > 0
  ) {
    if (
      String(obj.setting[0].allow[0]) == "PermissionsBitField.Flags.ViewChannel"
    ) {
      obj.setting[0].allow[0] = PermissionsBitField.Flags.ViewChannel;
      console.log("$$$", obj.setting);
    }
    channel.permissionOverwrites.edit(obj.setting[0].id, { ViewChannel: true });
  }
}

//イベント作成
async function createScheduledEvents(obj) {
  let guildID = obj.guildID,
    channelID = obj.channelID,
    scheduledStartAt = obj.scheduledStartAt,
    scheduledEndAt = obj.scheduledEndAt,
    name = obj.name,
    description = obj.description,
    privacyLevel = obj.privacyLevel,
    entityType = obj.entityType,
    entityMetadata = obj.entityMetadata;
  let guild = await client.guilds.fetch(String(guildID)),
    channel;

  let start = String(new Date(String(scheduledStartAt)).toISOString()),
    end = String(new Date(String(scheduledEndAt)).toISOString());
  if (channelID == "null") {
    channel = null;
  } else {
    channel = client.channels.cache.get(String(obj.channel1ID));
  }

  const res = await guild.scheduledEvents.create({
    image: null,
    scheduledStartTime: new Date(String(start)),
    scheduledEndTime: new Date(String(end)),
    name: String(name),
    description: String(description),
    privacyLevel: Number(privacyLevel),
    entityType: Number(entityType),
    entityMetadata: { location: String(entityMetadata) },
    channel: channel,
  });

  console.log("createScheduledEvents res", res);
}

//メンバーの一覧を返す
async function memberListRetliever(obj) {
  let guildID = obj.guildID,
    url = obj.url,
    io = obj.io;
  if (String(io) != String(process.env.io)) {
    return;
  }
  let memberList = await memberListExtracter(guildID);
  let res;
  let p1 = {
    obj: obj,
    memberList: memberList,
  };
  //メンバーリスト返信
  try {
    let req = JSON.stringify({
      p1: p1,
    });
    console.log("req", req);
    res = await fetching1(String(url), req);
    console.log("res.結果", res);
  } catch (e) {
    console.warn(e);
  }
  return;
}

//ロールの一覧を返す
async function roleListRetliever(obj) {
  let guildID = obj.guildID,
    url = obj.url,
    io = obj.io;
  if (String(io) != String(process.env.io)) {
    return;
  }
  let roleList = await roleListExtracter(guildID);
  let res;
  let p1 = {
    obj: obj,
    roleList: roleList,
  };
  //メンバーリスト返信
  try {
    let req = JSON.stringify({
      p1: p1,
    });
    console.log("req", req);
    res = await fetching1(String(url), req);
    console.log("res.結果", res);
  } catch (e) {
    console.warn(e);
  }
  return;
}

/*-----以下は汎用関数群-----*/

//スリープ
const sleep = (milliseconds) => new Promise((_) => setTimeout(_, milliseconds));

//絵文字検出
function myPromise2q(beforeMessage) {
  return new Promise(function (resolve, reject) {
    var emojiCs = Promise.all(
      beforeMessage.reactions.cache.map(async (reaction) => {
        const emojiName = reaction._emoji.name;
        const emojiCount = reaction.count;
        const reactionUsers = Array.from(await reaction.users.fetch());
        console.log(emojiName, emojiCount);
        return [emojiName, reactionUsers];
      })
    );
    resolve(emojiCs);
  });
}

//httpリクエスト送信
async function fetching1(uri, okuruJson) {
  try {
    /*console.log(okuruJson);*/
    const res = await fetch(uri, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: okuruJson,
    });
    const kekka = await res.json();
    const strings = await JSON.parse(JSON.stringify(kekka));
    const data = strings["結果"];
    /*console.log("data: ", data);*/
    return data;
  } catch (error) {
    console.log(error);
    return "APIエラーでは？";
  }
}

//Discord用文字列分割ユニット
function stirngLengthSplitter(add, str, num) {
  var sig = 1,
    /*num = 10, */ rop = 0,
    arr = [];
  /*var add = "123", str = "ぽんぽこボック スは 「ぽんぽこ経済圏」というごっこ遊びに使うおもちゃです。便利\nに使いましょう。";*/ //テスト用文

  while (Number(sig) == 1) {
    let word1 = "",
      word2 = "";
    if (String(str).search("```") != -1) {
      (word1 = "\n\n▼▼次ページへ続く▼▼```\n"), (word2 = "```");
    }
    if (str.length > Number(num)) {
      arr.push([String(add), , String(str).slice(0, Number(num)) + word1]);
      str = word2 + String(str).slice(Number(num));
    } else if (str.length <= Number(num)) {
      arr.push([String(add), , String(str)]);
      break;
    }
    if (Number(rop) > 1000) {
      console.warn("異常ループ検知");
      break;
    }
    rop++;
  }
  /*console.log("arr", arr);*/ return arr;
}

//サーバー内検索ユニット(IDからユーザー名）
function peopleInTheGuild(guildId, userId) {
  try {
    let guild = client.guilds.cache.get(String(guildId));
    let user = client.users.cache.find((user) => user.id == String(userId));
    if (!user) {
      return "ありません";
    } else {
      let memId = guild.members.cache.get(userId);
      if (!memId) {
        return "ありません";
      } else {
        console.log(`成功！${memId}`);
        let userName = String(user.username);
        return "あります" + String(userName);
      }
    }
  } catch (e) {
    console.log("失敗！", e);
    return "通信エラー" + String(e);
  }
}

//サーバー内検索ユニット(ユーザー名からID）
function peopleInTheGuild2(guildId, userName) {
  try {
    let guild = client.guilds.cache.get(String(guildId));
    let user = client.users.cache.find(
      (user) => user.username == String(userName)
    );
    if (!user) {
      return "ありません";
    } else {
      let userId = String(user.id);
      let memId = guild.members.cache.get(userId);
      if (!memId) {
        return "ありません";
      } else {
        console.log(`成功！${memId}`);
        return "あります" + String(userId);
      }
    }
  } catch (e) {
    console.log("失敗！", e);
    return "通信エラー" + String(e);
  }
}

//メッセージ送信
//メッセージ送信（webhook）
async function webhook1(settings) {
  console.log(settings.webhookId);
  const webhookClient = new WebhookClient({
    id: String(settings.webhookId),
    token: String(settings.webhookToken),
  });

  let embeds = null,
    avatarURL = null,
    flags = null,
    files = null;

  if (settings.embedIs == "true") {
    embeds = new EmbedBuilder()
      .setTitle(String(settings.title))
      .setColor(String(settings.color));
    embeds = [embeds];
  }
  if (settings.avatarURL != "") {
    avatarURL = String(settings.avatarURL);
  }
  if (settings.flags != "") {
    flags = [Number(settings.flags)];
  }
  if (settings.files != "") {
    files = [String(settings.files)];
  }
  let text = String(settings.content),
    option = { embeds, flags, files };

  webhookClient
    .send({
      content: String(settings.content),
      username: String(settings.username),
      avatarURL: avatarURL,
      embeds: embeds,
      flags: flags,
      files: files,
    })
    .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
    .catch(console.error);
}

//メッセージ送信（添付ファイルなど）
async function sendMsgWithFrags(channelId, text, options) {
  try {
    let flags = null,
      files = null,
      emojis = null,
      reply = null,
      allowedMentions = null;
    if (options != undefined && options != null && options.ext != null) {
      (flags = options.flags),
        (files = options.files),
        (emojis = options.emojis),
        (reply = options.reply),
        (allowedMentions = options.allowedMentions);
    }
    if (reply != undefined && reply != null) {
      reply = { messageReference: String(reply) };
    }else{reply = { messageReference: null };}
    if (allowedMentions != undefined && allowedMentions != null) {
      allowedMentions = { parse: allowedMentions };
    }

    let option = { flags, files, reply, allowedMentions };
    let emojiStr;
    console.log("bbbbbbb", channelId, text, options);
    let sentMes = await client.channels.cache
      .get(channelId)
      .send({
        content: text,
        flags: flags,
        files: files,
        reply: reply,
        allowedMentions: allowedMentions,
      })
      .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
      .catch(console.error);
    if (emojis != undefined && emojis != null && emojis.length > 0) {
      for (let i = 0; i < emojis.length; i++) {
        if (String(emojis[i]) != "") {
          emojiStr = String(emojis[i]);
          /*console.log(emojiStr);*/
          sentMes.react(String(emojiStr));
        }
      }
    }
  } catch (e) {
    console.warn(e);
  }
}

//メッセージ送信（埋込み）
async function sendEmbedMsg(
  channelId,
  fieldTitle,
  text,
  image,
  color,
  option = {}
) {
  console.log("sendEmbedMsg", channelId, fieldTitle, text, image, color);
  /*const sleep = (second) =>
        new Promise((resolve) => setTimeout(resolve, second * 1000));

      await sleep(5);*/
  const embed = new EmbedBuilder()
    /*.setTitle('タイトル')
    .setURL('https://docs.google.com/forms/d/e/1FAIpQLSfsZqwROnrcLAs2L91KGGomlNPNXQd6mYRHBoF5LtiEFwTqcA/viewform?usp=sf_link')
    .setDescription('これはテストです')
    setThumbnail('https://uc0fc1774c9ddfcd14b588119fd0.previews.dropboxusercontent.com/p/thumb/ACHH7JQ-OMXpfc9pkKjRJYaGnOMWr70REimfZRCSOtuo35xCNNNFJjzKFRBLtuvDjmy55JCUuFVROqHkwisiP9AFYpKyOR9uiNWTtNJAmOz9UDlW-TSqQnYmzSxS446cmrR-Ntrf-UASe8PYrgqcEXZqkt-aXlSyYUxw-1MJk0VwyVxB4UVKLiylZw50hG49UPPSOQEUOkYYHLgeBuou5pQRQe-G166qCFnmepndu7mbenRhOPI3jid29XU89yrzBKFv8XACmgW1pqWYAIuHdP3T4jg6o3Qn6Eh4FcQPQhl36p8KDyvn2bf4YmXwlC-mm6Qmyi-WJ-fW0_xdV79ZmP4QReH5bIsDsCADG-C6hSAasHqjNWos66Zrt8ovRzrsgYk/p.png')*/
    .setAuthor({
      name: "だるまさん",
      iconURL:
        "https://gyazo.com/ade9df5d2f03fe9e348b884b3bb7036e/max_size/1000",
    })
    .addFields({ name: fieldTitle, value: text, inline: false })
    .setImage(image)
    .setColor(Number(color))
    .setTimestamp();

  client.channels.cache
    .get(channelId)
    .send({ embeds: [embed] })
    .then(
      console.log("埋め込みメッセージ送信: " + text + JSON.stringify(option))
    )
    .catch(console.error);
}

async function sendMsg(channelId, text, option = {}) {
  console.log("aaaaaaa", channelId, text);
  client.channels.cache
    .get(channelId)
    .send(text, option)
    .then(console.log("メッセージ送信: " + text + JSON.stringify(option)))
    .catch(console.error);
}

function sendDm(userId, text, option = {}) {
  client.users
    .fetch(userId)
    .then((e) => {
      e.send(text, option)
        .then(console.log("DM送信: " + text + JSON.stringify(option)))
        .catch(console.error); // 1段階目のエラー出力
    })
    .catch(console.error); // 2段階目のエラー出力
}
