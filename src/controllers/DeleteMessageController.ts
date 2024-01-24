import DeleteMessageService from '../services/DeleteMessageService';
import Telegram from '../client/Telegram';
import OicqClient from '../client/OicqClient';
import { Api } from 'telegram';
import { FriendRecallEvent, GroupRecallEvent } from 'icqq';
import Instance from '../models/Instance';

export default class DeleteMessageController {
  private readonly deleteMessageService: DeleteMessageService;

  constructor(private readonly instance: Instance,
              private readonly tgBot: Telegram,
              private readonly oicq: OicqClient) {
    this.deleteMessageService = new DeleteMessageService(this.instance, tgBot);
    tgBot.addNewMessageEventHandler(this.onTelegramMessage);
    tgBot.addEditedMessageEventHandler(this.onTelegramEditMessage);
    // tgUser.addDeletedMessageEventHandler(this.onTgDeletedMessage);
    oicq.on('notice.friend.recall', this.onQqRecall);
    oicq.on('notice.group.recall', this.onQqRecall);
  }

  private onTelegramMessage = async (message: Api.Message) => {
    const pair = this.instance.forwardPairs.find(message.chat);
    if (!pair) return false;
    if (message.message?.startsWith('/rm')) {
      // 撤回消息
      await this.deleteMessageService.handleTelegramMessageRm(message, pair);
      return true;
    }
  };

  private onTelegramEditMessage = async (message: Api.Message) => {
    if (message.senderId?.eq(this.instance.botMe.id)) return true;
    const pair = this.instance.forwardPairs.find(message.chat);
    if (!pair) return;
    if (await this.deleteMessageService.isInvalidEdit(message, pair)) {
      return true;
    }
    await this.deleteMessageService.telegramDeleteMessage(message.id, pair);
    return await this.onTelegramMessage(message);
  };

  private onQqRecall = async (event: FriendRecallEvent | GroupRecallEvent) => {
    const pair = this.instance.forwardPairs.find('friend' in event ? event.friend : event.group);
    if (!pair) return;
    await this.deleteMessageService.handleQqRecall(event, pair);
  };

}
