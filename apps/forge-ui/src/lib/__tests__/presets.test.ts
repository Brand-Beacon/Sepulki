// Unit tests for presets utility
// Tests preset suggestion logic based on user input and analysis

import { suggestPresetFromAnalysis } from '../presets';

describe('presets utilities', () => {
  describe('suggestPresetFromAnalysis', () => {
    test('suggests unitree-dog for dog-related input', () => {
      const preset = suggestPresetFromAnalysis(
        'I need a robot dog',
        'Analysis about quadruped robots'
      );

      expect(preset).toBe('unitree-dog');
    });

    test('suggests unitree-dog for quadruped mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Looking for a quadruped robot',
        ''
      );

      expect(preset).toBe('unitree-dog');
    });

    test('suggests unitree-dog for patrol mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Need a robot for patrol duties',
        ''
      );

      expect(preset).toBe('unitree-dog');
    });

    test('suggests unitree-dog for unitree brand mention', () => {
      const preset = suggestPresetFromAnalysis(
        'I want a Unitree robot',
        ''
      );

      expect(preset).toBe('unitree-dog');
    });

    test('suggests unitree-dog for spot mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Similar to Spot robot',
        ''
      );

      expect(preset).toBe('unitree-dog');
    });

    test('suggests industrial-arm for arm-related input', () => {
      const preset = suggestPresetFromAnalysis(
        'I need a robot arm',
        'Analysis about manipulators'
      );

      expect(preset).toBe('industrial-arm');
    });

    test('suggests industrial-arm for industrial arm mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Looking for an industrial arm',
        ''
      );

      expect(preset).toBe('industrial-arm');
    });

    test('suggests industrial-arm for manipulator mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Need a manipulator robot',
        ''
      );

      expect(preset).toBe('industrial-arm');
    });

    test('suggests industrial-arm for pick and place mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Robot for pick and place tasks',
        ''
      );

      expect(preset).toBe('industrial-arm');
    });

    test('suggests industrial-arm for welding mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Automated welding robot',
        ''
      );

      expect(preset).toBe('industrial-arm');
    });

    test('suggests industrial-arm for factory mention', () => {
      const preset = suggestPresetFromAnalysis(
        'Factory automation robot',
        ''
      );

      expect(preset).toBe('industrial-arm');
    });

    test('defaults to sample-arm for unrecognized input', () => {
      const preset = suggestPresetFromAnalysis(
        'Random robot request',
        'Generic analysis'
      );

      expect(preset).toBe('sample-arm');
    });

    test('prioritizes dog hints over arm hints', () => {
      const preset = suggestPresetFromAnalysis(
        'Robot dog for pick and place',
        ''
      );

      expect(preset).toBe('unitree-dog');
    });

    test('is case insensitive', () => {
      const preset1 = suggestPresetFromAnalysis(
        'ROBOT DOG',
        ''
      );

      const preset2 = suggestPresetFromAnalysis(
        'Robot Arm',
        ''
      );

      expect(preset1).toBe('unitree-dog');
      expect(preset2).toBe('industrial-arm');
    });

    test('searches both user input and analysis', () => {
      const preset1 = suggestPresetFromAnalysis(
        'Random text',
        'This is about quadruped robots'
      );

      const preset2 = suggestPresetFromAnalysis(
        'Robot arm needed',
        'Generic analysis'
      );

      expect(preset1).toBe('unitree-dog');
      expect(preset2).toBe('industrial-arm');
    });
  });
});

