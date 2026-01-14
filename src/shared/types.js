// Shared types between client and server
export var ChannelType;
(function (ChannelType) {
    ChannelType["SMS"] = "SMS";
    ChannelType["MMS"] = "MMS";
    ChannelType["WHATSAPP"] = "WHATSAPP";
    ChannelType["MESSENGER"] = "MESSENGER";
})(ChannelType || (ChannelType = {}));
export var MessageStatus;
(function (MessageStatus) {
    MessageStatus["QUEUED"] = "QUEUED";
    MessageStatus["SENDING"] = "SENDING";
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
    MessageStatus["FAILED"] = "FAILED";
    MessageStatus["UNDELIVERED"] = "UNDELIVERED";
    MessageStatus["CANCELED"] = "CANCELED";
})(MessageStatus || (MessageStatus = {}));
export var Direction;
(function (Direction) {
    Direction["INBOUND"] = "INBOUND";
    Direction["OUTBOUND"] = "OUTBOUND";
})(Direction || (Direction = {}));
