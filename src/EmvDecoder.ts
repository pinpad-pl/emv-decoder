import { Buffer } from "buffer";
import tags from './emvtags.json';

interface EmvTag {
    name: string;
    tag?: string;
    length: number;
    bits?: string[];
    bytes?: any[];
}

type DecodedTag = {
    numberOfRFUs: number;
    result: string;
};

export class EmvDecoder {

    private static validateTagsArray(tagsArray: EmvTag[]) {
        for(const tag of tagsArray) {
            if (tag.bits?.length) {
                if (tag.bits.length / 8 != tag.length) {
                    return tag.name || "Unknown tag";
                }
            }
            if (tag.bytes?.length) {
                if (tag.bytes.length != tag.length) {
                    return tag.name || "Uknown tag";
                }
            }

        }
        return undefined;
    }
    private static decodeTag(buf: Buffer, emvTag: EmvTag): DecodedTag {
        const res: DecodedTag = {
            numberOfRFUs: 0,
            result: `${emvTag.name}:\n`
        };

        if (emvTag.tag) {
            res.result += `TAG: ${emvTag.tag}`;
        }

        res.result += "\n";

        if (emvTag.bits) {
            for (let i = 0; i < emvTag.bits.length; i++) {
                const byte = Math.floor(i / 8) + 1;
                const bit = i % 8 + 1;
                if (buf[byte - 1] & (1 << (bit - 1))) {
                    res.result += `Byte ${byte} bit ${bit}: ${emvTag.bits[i]}\n`;
                    if (emvTag.bits[i] == "RFU") {
                        res.numberOfRFUs++;
                    }
                }
            }
        }
        if (emvTag.bytes) {
            for (let i = 0; i < buf.length; i++) {
                let hexByte = buf[i].toString(16).toUpperCase();
                if (hexByte.length < 2) {
                    hexByte = "0" + hexByte;
                }

                const byteDesc = emvTag.bytes[i][hexByte];
                res.result += `Byte ${i + 1} (${hexByte}): ${byteDesc || "RFU"}\n`;
                if (byteDesc == "RFU" || !byteDesc) {
                    res.numberOfRFUs++;
                }
            }
        }
        res.result += "\n\n";
        return res;
    }

    private static decodeTags(buf: Buffer): string {
        let res = "";
        const decodedTags: DecodedTag[] = [];
        for(const tag of tags.emvTags) {
            if (tag.length == buf.length) {
                decodedTags.push(this.decodeTag(buf, tag));
            }
        }
        decodedTags.sort((a, b) => {return a.numberOfRFUs - b.numberOfRFUs});

        for (const decodedTag of decodedTags) {
            res += decodedTag.result;
        }
        return res;
    }

    static processValue(value: string): string {
        value = value.trim();

        if (!value) {
            return "";
        }

        const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        const hexRegex = /^[0-9a-fA-F]+$/;

        let base64Value: string | undefined;
        let hexValue: string | undefined;

        if (base64Regex.test(value)) {
            base64Value = value;
        }

        if (hexRegex.test(value) && value.length % 2 == 0) {
            hexValue = value;
        }

        let result = "\n\n";

        if (!hexValue && !base64Value) {
            result += `Can't recognize encoding for value: ${value}`;
            return result;
        }

        result += `Source string length: ${value.length}\n`;

        const recognizedEncoding = (hexValue)? "HEX" : "BASE64";


        if (hexValue && base64Value) {
            result += "WARNING: THE ENTERED VALUE COULD EITHER BE HEX, or BASE64\n";
        }


        result += `Assumed source encoding: ${recognizedEncoding}\n`;



        let buf: Buffer | undefined;

        if (hexValue && hexValue.length % 2 == 0) {
            buf = Buffer.from(hexValue, "hex");
            base64Value = buf.toString("base64");
            result += `B64 value: ${base64Value}\n`;
        } else {
            buf = Buffer.from(value, "base64");
            hexValue = buf.toString("hex");
            result += `HEX value: ${hexValue}\n`;
        }

        result += `Length in bytes: ${buf.length}`;

        result += "\n\n";

        const invalidTag = this.validateTagsArray(tags.emvTags);

        if (invalidTag) {
            result += `ERROR: Invalid definition of tag ${invalidTag}`;
        } else {
            result += this.decodeTags(buf);
        }

        return result;
    }
}