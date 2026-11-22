import 'package:flutter_test/flutter_test.dart';
import 'package:digital_complaints/main.dart';

void main() {
  testWidgets('Splash screen renders tagline', (WidgetTester tester) async {
    await tester.pumpWidget(const DigitalComplaintsApp());
    expect(find.text('Civic issue reporting & tracking'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
