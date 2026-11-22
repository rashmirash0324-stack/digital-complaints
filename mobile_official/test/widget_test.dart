import 'package:flutter_test/flutter_test.dart';
import 'package:digital_official/main.dart';

void main() {
  testWidgets('Official splash renders portal badge', (WidgetTester tester) async {
    await tester.pumpWidget(const DigitalOfficialApp());
    expect(find.text('Staff & Admin Portal'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
