import { Buffer } from "buffer";
import tags from './emvtags.json';

interface EmvTag {
    name: string;
    tag?: string;
    alias?: string;
    length: number;
    bits?: string[];
    bytes?: any[];
}

class DecodedTags  {
    numberOfRFUs = 0;
    private static readonly INDENT_SIZE = 5;


    private result = "";
    private indentLevel = 0;

    getResult(): string {
        return this.result;
    }

    addToString(newString: string): void {
        const indent = (this.indentLevel && this.indentLevel < 20)? "                    ".slice(0, this.indentLevel) : "";
        this.result += `${indent}${newString}\n`;
    }

    increaseIndent(): void {
        this.indentLevel += DecodedTags.INDENT_SIZE;
    }

    decreaseIndent(): void {
        this.indentLevel -= DecodedTags.INDENT_SIZE;
    }

}

export class EmvDecoder {

    private static findEmvTag(alias: string): EmvTag | undefined {
        for (const tag of tags.emvTags) {
            if (tag.alias == alias) {
                return tag;
            }
        }
    }

    private static validateTagsArray(tagsArray: EmvTag[]) {
        for(const tag of tagsArray) {
            if (tag.bits?.length) {
                if (tag.bits.length / 8 != tag.length) {
                    return tag.name || "Unknown tag";
                }
            }
            if (tag.bytes?.length) {
                let numberOfBytes = 0;
                console.log(`Number of bytes for tag ${tag.name}: ${tag.bytes.length}`);
                for (let i = 0; i < tag.bytes.length; i++) {
                    const byteValue = (tag.bytes[i] as any)["XX"];
                    if (byteValue && byteValue.length && (byteValue.name || byteValue.followAlias)) {
                        console.log(`adding ${byteValue.length} bytes`);
                        numberOfBytes += byteValue.length;
                    } else {
                        console.log(`adding 1 byte`);
                        numberOfBytes++;
                    }
                }
                if (numberOfBytes != tag.length) {
                    console.error(`${numberOfBytes} != ${tag.length}`);
                    return tag.name || "Uknown tag";
                }
            }

        }
        return undefined;
    }

    private static decodeTag(buf: Buffer, emvTag: EmvTag, currentResult?: DecodedTags): DecodedTags {
        const res = currentResult ??  new DecodedTags();


        res.addToString(`${emvTag.name}: ${buf.toString('hex').toUpperCase()}`);

        if (emvTag.tag) {
            res.addToString(`TAG: ${emvTag.tag}`);
        }

        res.addToString("");

        if (emvTag.bits) {
            for (let i = 0; i < emvTag.bits.length; i++) {
                const byte = Math.floor(i / 8) + 1;
                const bit = i % 8 + 1;
                if (buf[byte - 1] & (1 << (bit - 1))) {
                    res.addToString(`Byte ${byte} bit ${bit}: ${emvTag.bits[i]}`);
                    if (emvTag.bits[i] == "RFU") {
                        res.numberOfRFUs++;
                    }
                }
            }
        }
        if (emvTag.bytes) {
            for (let i = 0, j = 0; i < buf.length && j < buf.length; i++, j++) {
                console.log(`i=${i}, j=${j}, buflen=${buf.length}`);
                let hexByte = buf[j].toString(16).toUpperCase();
                if (hexByte.length < 2) {
                    hexByte = "0" + hexByte;
                }

                console.log(`i=${i}, j=${j}, buflen=${buf.length}, name: ${emvTag.name}, hexByte: ${hexByte}`);

                if (!emvTag.bytes[i]) {
                    continue;
                }
                const byteDesc = emvTag.bytes[i][hexByte] || emvTag.bytes[i]["XX"];
                if (byteDesc === "") {
                    continue;
                }
                if (typeof byteDesc == 'string') {
                    res.addToString(`Byte ${i + 1} (${hexByte}): ${byteDesc || "RFU"}`);
                } else if (byteDesc !== undefined) {
                    const subTagLen = byteDesc.length;
                    if (subTagLen) {
                        console.log(`Subtag len on pos ${i}: ${subTagLen}`);
                        const subArray = buf.subarray(j, j + subTagLen);
                        res.addToString(`Bytes ${j+1} - ${j + subTagLen}`);
                        res.increaseIndent();
                        console.log(`Deconding hex: ${subArray.toString('hex')}`);
                        const tagDef = byteDesc.name? byteDesc : this.findEmvTag(byteDesc.followAlias);
                        this.decodeTag(subArray, tagDef, res);
                        console.log("Decoded");
                        j += subTagLen -1;
                        res.decreaseIndent();
                    }
                } else {
                    res.addToString("RFU");
                }
                if (byteDesc == "RFU" || !byteDesc) {
                    res.numberOfRFUs++;
                }
            }
        }
        res.addToString("\n");
        return res;
    }

    private static decodeTags(buf: Buffer): string {
        let res = "";
        console.log("Looking for matching tags");
        const decodedTags: DecodedTags[] = [];
        for(const tag of tags.emvTags) {
            if (tag.length == buf.length) {
                console.log(`Matching length for tag ${tag.name}`);
                decodedTags.push(this.decodeTag(buf, tag));
            }
        }
        decodedTags.sort((a, b) => {return a.numberOfRFUs - b.numberOfRFUs});

        for (const decodedTag of decodedTags) {
            res += decodedTag.getResult();
        }
        return res;
    }

    static processValue(value: string): string {
        value = value.trim();

        if (!value) {
            return "";
        }

        let forceBase64 = false;


        if (value[0] == "=") {
            value = value.slice(1);
            forceBase64 = true;
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

        let result = `\n\nSource string length: ${value.length}\n`;

        if (!hexValue && !base64Value) {
            result += `Can't recognize encoding for value: ${value}\n`;
            return result;
        }


        const recognizedEncoding = (hexValue && !forceBase64)? "HEX" : "BASE64";


        if (hexValue && base64Value && !forceBase64) {
            result += `
            WARNING: THE ENTERED VALUE COULD EITHER BE HEX, or BASE64
            In order to force BASE64, use "=" at the beggining of the string (e.g. "=AAAA")\n`;
        }


        result += `Assumed source encoding: ${recognizedEncoding}\n`;



        let buf: Buffer | undefined;

        if (hexValue && hexValue.length % 2 == 0 && !forceBase64) {
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