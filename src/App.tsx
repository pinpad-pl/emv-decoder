/* eslint-disable @typescript-eslint/no-var-requires */
import React, {useState} from 'react';
import {Text, View, TextInput} from 'react-native';
import { EmvDecoder } from './EmvDecoder';

// eslint-disable-next-line no-undef
global.Buffer = global.Buffer || require('buffer').Buffer;


const App = () => {
    const valueFromUrl = new URLSearchParams(window.location.search)?.get("value") || window.location.pathname.slice(1);
    const initialRsult = (valueFromUrl?.trim())? EmvDecoder.processValue(valueFromUrl) : "";
    const [result, setResult] = useState(initialRsult);

    return (
        <View >
            <View>
                <br></br>
                <TextInput
                    defaultValue={valueFromUrl || undefined}
                    placeholder="Type/paste a hex or base64 value"
                    onChangeText={inputValue => {
                        setResult(EmvDecoder.processValue(inputValue));
                        if (window.history.pushState) {
                            const newurl = window.location.protocol + "//" + window.location.host + "/" + inputValue;
                            window.history.pushState({path:newurl},'',newurl);
                        }
                    } }
                />

                <Text>
                    <br></br> {result}
                </Text>
            </View>
        </View>
    );
};

export default App;