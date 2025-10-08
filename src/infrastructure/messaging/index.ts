import { EventBridgeService, SNSNotificationService } from "./MessagingServices";

export const notificationService = new SNSNotificationService();
export const eventService = new EventBridgeService();