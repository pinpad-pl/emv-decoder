import { Buffer } from "buffer";
import tags from './emvtags.json';


interface EmvTag {
    name: string;
    tag?: string;
    length: number;
    bits: string[];
}

export class EmvDecoder {

    private static validateTagsArray(tagsArray: EmvTag[]) {
        for(const tag of tagsArray) {
            if (tag.bits.length / 8 != tag.length) {
                return tag.name || "Unknown tag";
            }
        }
        return undefined;
    }
    private static decodeTag(buf: Buffer, emvTag: EmvTag): string {
        let res = `${emvTag.name}:\n`;
        if (emvTag.tag) {
            res += `TAG: ${emvTag.tag}`;
        }

        res+= "\n";

        for (let i = 0; i < emvTag.bits.length; i++) {
            const byte = Math.floor(i / 8) + 1;
            const bit = i % 8 + 1;
            if (buf[byte - 1] & (1 << (bit - 1))) {
                res += `Byte ${byte} bit ${bit}: ${emvTag.bits[i]}\n`;
            }
        }
        res += "\n\n";
        return res;
    }
    private static decodeTags(buf: Buffer): string {
        let res = "";
        for(const tag of tags.emvTags) {
            if (tag.length == buf.length) {
                res += this.decodeTag(buf, tag);
            }
        }
        return res;
    }

    static processValue(value: string): string {
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

        if (!hexValue && !base64Value) {
            return `Can't recognize encoding for value: ${value}`;
        }

        const recognizedEncoding = (hexValue)? "HEX" : "BASE64";

        let result = "\n\n";

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