import React, {useState} from 'react';
import {Text, View, TextInput} from 'react-native';
import { EmvDecoder } from './EmvDecoder';


const App = () => {
    const valueFromUrl = new URLSearchParams(window.location.search)?.get("value");
    const initialRsult = (valueFromUrl)? EmvDecoder.processValue(valueFromUrl) : "";
    const [result, setResult] = useState(EmvDecoder.processValue(initialRsult));

    return (
        <View >
            <View>
                <br></br>
                <TextInput
                    defaultValue={valueFromUrl || undefined}
                    placeholder="Type/paste a hex or base64 value"
                    onChangeText={inputValue => { setResult(EmvDecoder.processValue(inputValue)) } }
                />

                <Text>
                    <br></br> {result}
                </Text>
            </View>
        </View>
    );
};

export default App;