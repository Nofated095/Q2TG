import Instance from '../models/Instance';
import Telegram from '../client/Telegram';
import OicqClient from '../client/OicqClient';
import { Api } from 'telegram';

export default class AliveCheckController {
  constructor(private readonly instance: Instance,
              private readonly tgBot: Telegram,
              private readonly oicq: OicqClient) {
    tgBot.addNewMessageEventHandler(this.handleMessage);
  }

  private handleMessage = async (message: Api.Message) => {
    if (!message.sender.id.eq(this.instance.owner) || !message.isPrivate) {
      return false;
    }
    if (!['似了吗', '/alive'].includes(message.message)) {
      return false;
    }

    await message.reply({
      message: await this.genMessage(this.instance.id === 0 ? Instance.instances : [this.instance]),
    });
  };

  private async genMessage(instances: Instance[]): Promise<string> {
    const boolToStr = (value: boolean) => {
      return value ? '好' : '坏';
    };
    const messageParts: string[] = [];

    for (const instance of instances) {
      const oicq = instance.oicq;
      const tgBot = instance.tgBot;

    return messageParts.join('\n\n');
  };
}
