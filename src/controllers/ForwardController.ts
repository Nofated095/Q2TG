import Telegram from '../client/Telegram';
import OicqClient from '../client/OicqClient';
import ForwardService from '../services/ForwardService';
import {
  Friend,
  FriendPokeEvent,
  GroupMessageEvent,
  GroupPokeEvent,
  MemberIncreaseEvent,
  PrivateMessageEvent,
} from 'oicq';
import db from '../models/db';
import { Api } from 'telegram';
import { getLogger, Logger } from 'log4js';
import Instance from '../models/Instance';
import { getAvatar } from '../utils/urls';
import { CustomFile } from 'telegram/client/uploads';
import forwardHelper from '../helpers/forwardHelper';
import helper from '../helpers/forwardHelper';

export default class ForwardController {
  private readonly forwardService: ForwardService;
  private readonly log: Logger;

  constructor(
    private readonly instance: Instance,
    private readonly tgBot: Telegram,
    private readonly oicq: OicqClient,
  ) {
    this.log = getLogger(`ForwardController - ${instance.id}`);
    this.forwardService = new ForwardService(this.instance, tgBot, oicq);
    oicq.addNewMessageEventHandler(this.onQqMessage);
    oicq.on('notice.group.increase', this.onQqGroupMemberIncrease);
    oicq.on('notice.friend.poke', this.onQqPoke);
    oicq.on('notice.group.poke', this.onQqPoke);
    tgBot.addNewMessageEventHandler(this.onTelegramMessage);
    tgBot.addEditedMessageEventHandler(this.onTelegramMessage);
    instance.workMode === 'group' && tgBot.addChannelParticipantEventHandler(this.onTelegramParticipant);
  }

  private onQqMessage = async (event: PrivateMessageEvent | GroupMessageEvent) => {
    try {
      const target = event.message_type === 'private' ? event.friend : event.group;
      const pair = this.instance.forwardPairs.find(target);
      if (!pair) return;
      if (!pair.enable) return;
      if (pair.disableQ2TG) return;
      const tgMessage = await this.forwardService.forwardFromQq(event, pair);
      if (tgMessage) {
        // 更新数据库
        await db.message.create({
          data: {
            qqRoomId: pair.qqRoomId,
            qqSenderId: event.user_id,
            time: event.time,
            brief: event.raw_message,
            seq: event.seq,
            rand: event.rand,
            pktnum: event.pktnum,
            tgChatId: pair.tgId,
            tgMsgId: tgMessage.id,
            instanceId: this.instance.id,
            tgMessageText: tgMessage.message,
            tgFileId: forwardHelper.getMessageDocumentId(tgMessage),
            nick: event.nickname,
            tgSenderId: BigInt(this.tgBot.me.id.toString()),
          },
        });
      }
    }
    catch (e) {
      this.log.error('处理 QQ 消息时遇到问题', e);
    }
  };

  private onTelegramMessage = async (message: Api.Message) => {
    try {
      if (message.senderId?.eq(this.instance.botMe.id)) return true;
      const pair = this.instance.forwardPairs.find(message.chat);
      if (!pair) return false;
      if (!pair.enable) return;
      if (pair.disableTG2Q) return;
      const qqMessagesSent = await this.forwardService.forwardFromTelegram(message, pair);
      if (qqMessagesSent) {
        // 更新数据库
        for (const qqMessageSent of qqMessagesSent) {
          await db.message.create({
            data: {
              qqRoomId: pair.qqRoomId,
              qqSenderId: this.oicq.uin,
              time: qqMessageSent.time,
              brief: qqMessageSent.brief,
              seq: qqMessageSent.seq,
              rand: qqMessageSent.rand,
              pktnum: 1,
              tgChatId: pair.tgId,
              tgMsgId: message.id,
              instanceId: this.instance.id,
              tgMessageText: message.message,
              tgFileId: forwardHelper.getMessageDocumentId(message),
              nick: helper.getUserDisplayName(message.sender),
              tgSenderId: BigInt(message.senderId.toString()),
            },
          });
        }
      }
    }
    catch (e) {
      this.log.error('处理 Telegram 消息时遇到问题', e);
    }
  };

  private onQqGroupMemberIncrease = async (event: MemberIncreaseEvent) => {
    try {
      const pair = this.instance.forwardPairs.find(event.group);
      if (!pair?.joinNotice) return false;
      const avatar = await getAvatar(event.user_id);
    }
    catch (e) {
      this.log.error('处理 QQ 群成员增加事件时遇到问题', e);
    }
  };

  private onTelegramParticipant = async (event: Api.UpdateChannelParticipant) => {
    try {
      const pair = this.instance.forwardPairs.find(event.channelId);
      if (!pair?.joinNotice) return false;
      if (
        !(event.newParticipant instanceof Api.ChannelParticipantAdmin) &&
        !(event.newParticipant instanceof Api.ChannelParticipantCreator) &&
        !(event.newParticipant instanceof Api.ChannelParticipant)
      )
        return false;
      const member = await this.tgBot.getChat(event.newParticipant.userId);
      await pair.qq.sendMsg(`${forwardHelper.getUserDisplayName(member.entity)} 加入了本群`);
    }
    catch (e) {
      this.log.error('处理 TG 群成员增加事件时遇到问题', e);
    }
  };

  private onQqPoke = async (event: FriendPokeEvent | GroupPokeEvent) => {
    const target = event.notice_type === 'friend' ? event.friend : event.group;
    const pair = this.instance.forwardPairs.find(target);
    if (!pair?.poke) return;
    let operatorName: string, targetName: string;
    if (target instanceof Friend) {
      if (event.operator_id === target.user_id) {
        operatorName = target.remark || target.nickname;
      }
      else {
        operatorName = '你';
      }
      if (event.operator_id === event.target_id) {
        targetName = '自己';
      }
      else if (event.target_id === target.user_id) {
        targetName = target.remark || target.nickname;
      }
      else {
        targetName = '你';
      }
    }
    else {
      const operator = target.pickMember(event.operator_id);
      await operator.renew();
      operatorName = operator.card || operator.info.nickname;
      if (event.operator_id === event.target_id) {
        targetName = '自己';
      }
      else {
        const targetUser = target.pickMember(event.target_id);
        await targetUser.renew();
        targetName = targetUser.card || targetUser.info.nickname;
      }
    }
    await pair.tg.sendMessage({
      message: `<i><b>${operatorName}</b>${event.action}<b>${targetName}</b>${event.suffix}</i>`,
      silent: true,
    });
  };
}
