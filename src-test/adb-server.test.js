/*
 * Copyright 2013 Kenny Root
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
  var origJstestDriverTestCase = window.TestCase;
  var origSinonTestCase = window.sinon.testCase;

  window.sinon.testCase = function() {
    throw Error('** Do not call sinon.testCase() directly, TestCase() will do this for you! **');
  };

  var globalSetUp = function() {
    // ... global setup stuff goes here
    if (this.originalSetUp) {
      this.originalSetUp();
    }
  };

  var globalTearDown = function() {
    // ... global tear down stuff goes here
    if (this.originalTearDown) {
      this.originalTearDown();
    }
  };

  window.TestCase = function(name, prototype, optType) {
    prototype.originalSetUp = prototype.setUp;
    prototype.setUp = globalSetUp;

    prototype.originalTearDown = prototype.tearDown;
    prototype.tearDown = globalTearDown;

    prototype = origSinonTestCase(prototype);
    return origJstestDriverTestCase(name, prototype, optType);
  };
})();

TestCase("AdbPacketTest", {
    'test fromMessage parses valid message': function() {
        var testMessage = [
            0x53, 0x59, 0x4e, 0x43,
            0x01, 0x00, 0x00, 0x00,
            0x00, 0x10, 0x00, 0x00,
            0x00, 0xAA, 0x55, 0x00,
            0xAA, 0x11, 0x22, 0x33,
            0xAC, 0xA6, 0xB1, 0xBC,
        ];

        var pkt = new AdbPacket();
        assertTrue( pkt.fromMessage( new Uint8Array( testMessage ).buffer ) );
        assertTrue( pkt.isValid() );

        assertEquals( 0x434e5953, pkt.command );
        assertEquals( 0x01, pkt.arg0 );
        assertEquals( 4096, pkt.arg1 );
        assertEquals( 0x0055AA00, pkt.data_length );
        assertEquals( 0x332211AA, pkt.data_check );
        assertEquals( 0xBCB1A6AC, pkt.magic );
    },

    'test fromMessage notices corrupt messages': function() {
        var array = [
             0x53, 0x59, 0x4e, 0x43,
             0x01, 0x00, 0x00, 0x00,
             0x00, 0x10, 0x00, 0x00,
             0x00, 0xAA, 0x55, 0x00,
             0xAA, 0x11, 0x22, 0x33,
             0xAC, 0xA6, 0xB1, 0xFF, // <-- 0xFF is broken magic
        ];

        var pkt = new AdbPacket();
        assertTrue( pkt.fromMessage( new Uint8Array( array ).buffer ) );

        assertFalse( pkt.isValid() );
    },

    'test fromMessage rejects invalid size messages': function() {
        var array = [ 0x53, 0x59, 0x4e ];
        var pkt = new AdbPacket();
        assertFalse( pkt.fromMessage( new Uint8Array( array ).buffer ) );
    },

    'test setCommand sets magic correctly': function() {
        var pkt = new AdbPacket();
        assertEquals( 0, pkt.command );
        assertEquals( 0, pkt.magic );
        pkt.setCommand( 0x434e5953 );
        assertEquals( 0x434e5953, pkt.command );
        assertEquals( 0xBCB1A6AC, pkt.magic );
    },

    'test toMessage': function() {
        var pkt = new AdbPacket();

        pkt.setCommand( 0x434e5953 );
        pkt.arg0 = 0x01;
        pkt.arg1 = 4096;
        pkt.setData( new Uint8Array( [ 0x01, 0xAA, 0xFF, 0x10, 0xF0 ] ) );

        var testMessage = [
            0x53, 0x59, 0x4e, 0x43,
            0x01, 0x00, 0x00, 0x00,
            0x00, 0x10, 0x00, 0x00,
            0x05, 0x00, 0x00, 0x00,
            0xAA, 0x02, 0x00, 0x00,
            0xAC, 0xA6, 0xB1, 0xBC,
        ];
        assertArrayBufferEquals( new Uint8Array( testMessage ).buffer,
                pkt.toMessage() );
    }
});

TestCase("AdbSocketTest", {
  'test AdbSocket gets monotonic number' : function() {
    var server = null;
    var tcp = null;

    var socket1 = new AdbSocket(server, tcp);
    var socket2 = new AdbSocket(server, tcp);

    assertEquals(socket1.id + 1, socket2.id);
  }
});

TestCase("UsbDeviceTest", {
    'setUp': function() {
        this.cnxnRequest = new Uint8Array( [
            0x43, 0x4e, 0x58, 0x4e,
            0x00, 0x00, 0x00, 0x01,
            0x00, 0x10, 0x00, 0x00,
            0x07, 0x00, 0x00, 0x00,
            0x32, 0x02, 0x00, 0x00,
            0xBC, 0xB1, 0xA7, 0xB1,
        ] ).buffer;
        this.cnxnHostData = new Uint8Array( [
            104, 111, 115, 116, 58, 58, 0
        ] ).buffer;

        this.cnxnResponse = new Uint8Array( [
            0x43, 0x4e, 0x58, 0x4e,
            0x00, 0x00, 0x00, 0x01,
            0x00, 0x10, 0x00, 0x00,
            0x18, 0x00, 0x00, 0x00,
            0xAD, 0x09, 0x00, 0x00,
            0xBC, 0xB1, 0xA7, 0xB1,
        ] ).buffer;
        this.cnxnDeviceData = new Uint8Array( [
            0x64, 0x65, 0x76, 0x69, 0x63, 0x65, 0x3A, 0x4B, 0x65, 0x6E, 0x6E, 0x79,
            0x2D, 0x54, 0x65, 0x73, 0x74, 0x3A, 0x6E, 0x6F, 0x74, 0x68, 0x69, 0x6E,
            0x67
        ] ).buffer;
    },

    'test sends CNXN on initialization': function() {
        var device = new UsbDevice();
        var self = this;
        var usbMock = {
            'transferCalls': 0,
            'bulkTransfer': function( deviceId, options, callback ) {
                if ( options['direction'] == "in" ) {
                    this.readCallback = callback;
                    this.readLength = options['length'];
                    return;
                }

                this.transferCalls++;

                assertTrue( device.currentlyWriting );

                assertEquals( device.deviceId, deviceId );
                assertEquals( 'out', options['direction'] );

                if ( this.transferCalls == 1 ) {
                    assertArrayBufferEquals( self.cnxnRequest, options.data );
                    var response = {
                            'resultCode': 0,
                            'data': self.cnxnResponse
                    };
                    this.readCallback( response );
                    callback( { 'resultCode': 0 } );
                } else if ( this.transferCalls == 2 ) {
                    assertArrayBufferEquals( self.cnxnHostData, options.data );
                    var response = {
                            'resultCode': 0,
                            'data': self.cnxnDeviceData
                    };
                    this.readCallback( response );
                    callback( { 'resultCode': 0 } );
                }
            },
            'claimCalls': 0,
            'claimInterface': function( device, interfaceNumber, callback ) {
                this.claimCalls++;
                callback();
            },
            'releaseInterface': function( device, interfaceNumber, callback ) {
                fail( 'something caused a disconnect' );
            }
        };
        device.setUsb( usbMock );
        device.initialize( function() {
            assertEquals( 1, usbMock.claimCalls );
  
            // Should send data and then header
            assertEquals( 2, usbMock.transferCalls );
            assertFalse( device.currentlyWriting );
  
            assertEquals( UsbState.ONLINE, device.state );
        });
    },

    'test disconnect on unknown command': function() {
        var device = new UsbDevice();
        //var self = this;

        var unknownCommand = new AdbPacket();
        unknownCommand.setCommand( 0xFF0000FF );

        var usbMock = {
            'transferCalls': 0,
            'bulkTransfer': function( deviceId, options, callback ) {
                if ( (options['direction'] == "in") && (this.transferCalls++ == 0) ) {
                    var response = {
                            'resultCode': 0,
                            'data': unknownCommand.toMessage()
                    };
                    callback( response );
                }
            },

            'claimInterface': function( device, interfaceNumber, callback ) {
                callback();
            },

            'releaseInterface': function( device, interfaceNumber, callback ) {
                callback();
            },
        };
        device.setUsb( usbMock );

        var called = false;
        device.onDisconnect = function() {
            called = true;
        };

        device.initialize();
        assertTrue( called );
    }
});

TestCase("MonotonicTest", {
  'test Monotonic returns montonicly increasing' : function() {
    new Monotonic().setCounter(1);

    assertEquals(1, new Monotonic().next());
    assertEquals(2, new Monotonic().next());
    assertEquals(3, new Monotonic().next());
    assertEquals(4, new Monotonic().next());
  },

  'test Monotonic wraps at 32-bit boundary' : function() {
    new Monotonic().setCounter(0xFFFFFFFF);

    assertEquals(0xFFFFFFFF, new Monotonic().next());
    assertEquals(1, new Monotonic().next());
  }
}); 


TestCase('AuthManagerTest', {
  'setUp' : function() {
    var privateObj = {
      'n' : 'C4A76662F2C0868D3DF834B0DA041B78AA1EFF0A7B2E8E54281294C28BFC4AFB3709B93C9C19B6601D7E3A70A0D7D9C0B7A9057FAB4E54E82871D607AFD0E88C18A8E7B79883C67801DE2E00887FF729AE1469E374A575D2B7D1C3ED18DCB3D2E6D047B8C794B0FF83254014EECD68E29CEC5B76C597D243E7CF27A483973F6411C38A0B735BE6C688546A15E1CFC2E5A50A34EEDD64145432B70FC6BF17771F8D3FB482649D4D9AA1A12532DF8FA0E76FEB674548183DF2AFDAC2BB24C9B0BB316428E3BC5F57F719E803AB4CCBCBB1BB25F8245385875D27BA63F00C8303C1E94B595CA21F407B78AD2123359C31BE5825114AB3BB0C047B65FB1FF1F9863D',
      'e' : '010001',
      'd' : '7C55CAEA6CC9454930112A5F56B89A15E499CC6EF80B2B7A120C0D7A23BFD4389947D0927DAFD41B590A6230ABC14DB0076F1A46EA2C908A6867F106D326A6A14D461D9B7B1675F99254C3891AC4ADA4F0A77F7B8C58C0F205BEDEBD9DA68D1B9F4BB8CD1F82E795E5793BD7005567274048405C0BFA3DBB2969548B3398013F4AF188EFE5FBDAD0626A9AB6571E7F1766156BCEE466E2E24AED8C0E7FB517B23045A897A4A9872BFF6A8289BAA70F6E1A2A6C7E138925A64BF79ECCC1385E4A900BBC2021A3021F2D914219355686C83CEB7EF534F103603F1660CA279FF49AA2C9E847AB53CA32C22CF147EA465D535C3E104CE9DA3FF09DB6EE6A91ED9301',
      'p' : 'F677765400D13E16F21698DA1359D4F913DC4A6BD62FCE60064EE05380A3331AB179AE914C052D5C6D74D733462628741FC473C5FBEF137D1B371E1DB61C54D1D30D9640E0AAD1E19EAACA5B2A26DBBF1CE9BC96EDB8806551AE65875792D794DBB4F6E6BB7A9824CD59C0E8C49DE9EB24EE124409AA68F34B6B6CFF87D5FB71',
      'q' : 'CC42AFD7E096DCB4729CA2265E81A7816E085D98F2758B50BC88777034ABA046BE37CBAF8675CD0688D92EF529C1302885B3999D19D9AEA078D9A5EC247B7DD950C1B3A73F0801502D1E885AA44A114AFE325F7AFCBBA6F378B0BAEA3FB00446044AC4E819ECF53450ED9651BF90E121F3397D244E6F5FF443618EAF8C90198D',
      'dp' : 'DE6F84785DE07A23E54AE59A733A70CE76D12ACD561A012C82A4EF2A0D7FBCA08BA9E115BAC135662456FDDD85A2EC81992608C29713F6C7C3272463F6366D8A8CEAC73F384492750868E5860F6DD08713C61371378C7B3C75D26A49128D3149645C573477E135AC893446B90CB1E42A574311731C3212D3F8AE344A0E42DDD1',
      'dq' : '38FBA5A8B8DBFD684DCD0AA35F9C1609D2937CE10D4AE379BB8EEA9B1FE67D491F09DBC5F4E1EA379777D754C7B840621DA2940932CBFA9E83F85C047BCD03B7DB829E46DB1BB59A136C4027E14B5475B26285267F592E631FD955DBC1B6AE0A866A0172AAC0E34B1C049BF9E4525BAC27F972C2ED2ABEFF1AC91D9035CB8185',
      'c' : '84AA91335E5E993457F76B3B409848FE92C385F0D6F3BA71867987CBC83EA7983E937E92927491A92C4D31CB0F3A0460D29709173AA2980D67FAC5D3260E3F7366364965C9A97CFBA7E3321DA541558F43A55182D9E8AACE6BB9F8F90D9237A333E03EABE3C8236E834E92A117F12193FF5BB1D8435909B30893C1C08CBDECC9'
    };
    var rsaKey = new RSAKey();
    rsaKey.setPrivateEx(privateObj.n, privateObj.e, privateObj.d, privateObj.p, privateObj.q, privateObj.dp, privateObj.dq, privateObj.c);
    this.privateKey = rsaKey;

    this.publicKey = 'QAAAAOs+G/09hvnxH/tlewQMu7NKESVYvjGcNSMhrXh7QB+iXFlL6cEDgwzwY7on'
                   + 'XYeFUyT4Jbuxy8tMqwPoGfdXX7zjKGQxu7DJJLvC2q/yPRhIRWfrb+egj98yJaGh'
                   + 'mk2dZIK0P40fdxe/xg+3MlQUZN3uNAql5cLP4RVqVIjG5ltzC4rDEWQ/l4OkJ8/n'
                   + 'Q9KXxXZb7JziaM3uFEAlg/+wlMe4R9Dm0rPcGO3D0bfSdaV042kUrin3f4gALt4B'
                   + 'eMaDmLfnqBiM6NCvB9ZxKOhUTqt/Bam3wNnXoHA6fh1gthmcPLkJN/tK/IvClBIo'
                   + 'VI4uewr/Hqp4GwTasDT4PY2GwPJiZqfESMAAokvlg6pexbEcJ1OBnicwXTq9inm5'
                   + 'h5IT9d1+QnthRvLBqrNtPPXVx3beFkKdY5ML6Um86lZOom3KV53RlziKNY09oATP'
                   + '5AXOT5fqKqV/X+vbl3iWQx1XZl+3BYr0yWyYE/rrcD5no7U15hyxjWdbf1YBpWz6'
                   + 'msCRhF+NG23Xtocwvb5Jbbtt9FR0YsLJppVYUBwhCJd25Lj/518aaKjVcQdWPdaT'
                   + 'q48Wqk8dTPbWPbIXCa/j4chGsGGx8OqmUexGQcbajysQK0ePsoZXQPCtFv71UsZx'
                   + 'icOTunJtgxecoCbXsImmst2V9t1lJTo9y+Lh81QekzqWGAxKZKXARQEAAQA= '
                   + 'adb@chrome';
  },

  'test cannot sign when uninitialized' : function() {
    var am = new AuthManager();
    am.clearKeys();

    // "test nonce"
    var testNonce = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x20, 0x6E, 0x6F, 0x6E, 0x63, 0x65]).buffer;
    try {
      am.sign(testNonce);
      fail();
    } catch ( expected ) {
    }
  },

  'test convert to minCrypt format' : function() {
    var am = new AuthManager();

    assertEquals(this.publicKey, am._convertToMinCrypt(this.privateKey));
  },
 
  /* SLOW.. disable for now 
  'test generates keys': function() {
    var am = new AuthManager();
    am.clearKeys();

    assertNull(am.key_private);
    assertNull(null, am.key_public);

    am.initialize();

    assertNotNull(am.key_private);
    assertNotNull(am.key_public);

    assertEquals(am.key_private.constructor, RSAKey);
    assertEquals('string', typeof am.key_public);
  },
  */
  'test retains keys' : function() {
    var am = new AuthManager();

    am._setKey(this.privateKey);

    var privKeyModulus = am.key_private.n.toString(16);
    var pubKey = am.key_public;

    am = new AuthManager();
    am.initialize();

    assertEquals(privKeyModulus, am.key_private.n.toString(16));
    assertEquals(pubKey, am.key_public);
  },

  'test sign nonce correctly' : function() {
    var am = new AuthManager();

    // "test nonce"
    var testNonce = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x20, 0x6E, 0x6F, 0x6E, 0x63, 0x65]).buffer;
    var testSignature = new Uint8Array([0x0F, 0x03, 0x28, 0x90, 0x27, 0x37, 0x3C, 0xCD, 0x12, 0x6E, 0x40, 0x7C, 0x95, 0xB7, 0x19, 0x9B, 0x89, 0xF0, 0x7B, 0xC3, 0x5C, 0x23, 0x69, 0xB7, 0x41, 0x47, 0xA4, 0x0D, 0xDB, 0x44, 0xD0, 0x0D, 0x93, 0x03, 0xCC, 0xF1, 0xC3, 0xB3, 0x03, 0x1C, 0x9C, 0x07, 0x6E, 0x9E, 0x6A, 0xF0, 0xC6, 0x84, 0x36, 0x10, 0x5B, 0x4B, 0x85, 0x6E, 0x38, 0x1C, 0xA1, 0x6C, 0x7E, 0x93, 0x66, 0x57, 0x28, 0x73, 0x71, 0x41, 0x8B, 0x2D, 0x9E, 0xE5, 0x21, 0x2A, 0xAC, 0x86, 0x28, 0x02, 0x91, 0x63, 0x1E, 0x23, 0xAE, 0x88, 0xDD, 0xBB, 0x9A, 0x7C, 0xD7, 0xAC, 0x50, 0x2E, 0xFB, 0x36, 0xB9, 0xFF, 0xBF, 0xA1, 0x40, 0x0C, 0x80, 0x62, 0x06, 0x74, 0xE4, 0x6E, 0xC3, 0xC2, 0x0A, 0x08, 0x2D, 0xBE, 0x1D, 0xE3, 0xEE, 0x2A, 0x41, 0x6D, 0xFA, 0x4D, 0xDF, 0xC4, 0x1E, 0x20, 0x51, 0x12, 0x62, 0x33, 0x98, 0x81, 0x68, 0xDC, 0xD2, 0xD9, 0x27, 0x53, 0x90, 0x48, 0x32, 0x4B, 0x9A, 0x3D, 0xBF, 0x49, 0xB5, 0x5D, 0x91, 0x55, 0xCC, 0x9D, 0x16, 0xD5, 0x02, 0x86, 0xF7, 0x55, 0xE5, 0x96, 0x66, 0x33, 0x63, 0xAE, 0x07, 0xB6, 0xA0, 0xCB, 0xDF, 0x15, 0xA8, 0x7A, 0xF9, 0x14, 0xF9, 0x2B, 0xA6, 0x74, 0xCB, 0x87, 0xBE, 0xE0, 0x0D, 0x94, 0x14, 0x37, 0x81, 0xA4, 0xF5, 0x47, 0xC9, 0x6D, 0xB6, 0x7A, 0x20, 0xF8, 0xB0, 0xC2, 0x68, 0x36, 0x21, 0x96, 0xFA, 0xD7, 0x7E, 0x1E, 0xCA, 0x56, 0x68, 0xB2, 0x03, 0x29, 0xE9, 0xEF, 0x7D, 0xCA, 0xEF, 0xBB, 0xA1, 0x40, 0x9E, 0x24, 0xE2, 0xE4, 0x74, 0xD2, 0xDA, 0xC5, 0xE8, 0x56, 0xB0, 0x34, 0x4F, 0x86, 0xA2, 0x34, 0x3B, 0xB9, 0xCD, 0xE8, 0xB4, 0x19, 0xBF, 0x56, 0x94, 0x16, 0x61, 0xD6, 0xD2, 0x19, 0x32, 0xF4, 0xB2, 0x54, 0xC2, 0x66, 0xCA, 0x39, 0xDA, 0x43]).buffer;
    am._setKey(this.privateKey);

    var actual = am.sign(testNonce);
    assertArrayBufferEquals(testSignature, actual);
  }
}); 
