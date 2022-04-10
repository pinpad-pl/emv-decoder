import TLV from "node-tlv";
import { DecodingResult } from "./DecodedTags";
import { Buffer } from "buffer";
import { EmvDecoder } from "./EmvDecoder";

export class TlvParser {
    constructor(
        private data: Buffer,
        private decodingResult: DecodingResult = new DecodingResult()) {
    }

    private decodeTag(tag: TLV) {
        this.decodingResult.addToString(`TAG ${tag.getTag()} (${tag.getName()}): ${tag.value}`);
        if (tag.getChild().length == 0) {
            console.log(`value for tag ${tag.getTag()}: ${tag.value}`);
            EmvDecoder.decodeTag(Buffer.from(tag.value), tag.getTag(), this.decodingResult);
        }
        this.decodingResult.increaseIndent();
        for (const child of tag.getChild()) {
            console.log("Decondig tag " + child.getTag());
            this.decodeTag(child);
        }
        this.decodingResult.decreaseIndent();
    }
    decode(): DecodingResult {
        try {
            const rootTag = TLV.parse(this.data);

            if (rootTag.toString() == this.data.toString("hex").toUpperCase()) {
                this.decodeTag(rootTag);
            }
        } catch (e) {
            console.log("Couldn't parse TLV");
        }

        return this.decodingResult;
    }

}