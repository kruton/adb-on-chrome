function assertArrayBufferEquals(a, b) {
  assertEquals(a, b);
  assertEquals(a.byteLength, b.byteLength);

  var a8 = new Uint8Array(a);
  var b8 = new Uint8Array(b);

  for (var i = 0; i < a8.length; i++) {
    assertEquals("array position " + i, a8[i], b8[i]);
  }
}