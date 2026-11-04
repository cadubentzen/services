import { Inject } from '../../../base/decorators'
import { UserSettingsDisplayService } from './service'

describe('UserSettingsDisplayService', () => {

    let service: UserSettingsDisplayService
    let userSettings: { getValue: jest.Mock, set: jest.Mock, pauseNotify: jest.Mock, resumeNotify: jest.Mock }

    const setup = (user: Record<string, unknown> = {}) => {
        const stored: Record<string, unknown> = { ...user }
        userSettings = {
            getValue: jest.fn().mockImplementation(() => stored),
            set: jest.fn().mockImplementation((key: string, value: unknown) => {
                stored[key.replace('user.', '')] = value
            }),
            pauseNotify: jest.fn(),
            resumeNotify: jest.fn()
        }
        Inject('UserSettings', userSettings)
        Inject('UnitConverter', {
            convert: jest.fn((value: number) => value),
            getUnit: jest.fn().mockReturnValue('kg'),
            getUnits: jest.fn().mockReturnValue('metric')
        })
        service = new UserSettingsDisplayService()
    }

    afterEach(() => {
        Inject('UserSettings', null)
        Inject('UnitConverter', null)
        jest.clearAllMocks()
    })

    describe('setMaxHr', () => {

        test('setMaxHr stores user.maxHr', () => {
            setup()

            service.setMaxHr(185)

            expect(userSettings.set).toHaveBeenCalledWith('user.maxHr', 185)
        })

        test('setMaxHr with empty value stores null', () => {
            setup()

            service.setMaxHr(undefined)
            service.setMaxHr(null)

            expect(userSettings.set).toHaveBeenNthCalledWith(1, 'user.maxHr', null)
            expect(userSettings.set).toHaveBeenNthCalledWith(2, 'user.maxHr', null)
        })

        test('setMaxHr emits changed on an open observer', () => {
            setup({ maxHr: 185 })
            const observer = service.open()
            const onChanged = jest.fn()
            observer.on('changed', onChanged)

            service.setMaxHr(190)

            expect(onChanged).toHaveBeenCalledWith({ maxHr: 190 })
        })
    })

    describe('setThresholdHr', () => {

        test('setThresholdHr stores user.thresholdHr', () => {
            setup()

            service.setThresholdHr(170)

            expect(userSettings.set).toHaveBeenCalledWith('user.thresholdHr', 170)
        })

        test('setThresholdHr with empty value stores null', () => {
            setup()

            service.setThresholdHr(undefined)
            service.setThresholdHr(null)

            expect(userSettings.set).toHaveBeenNthCalledWith(1, 'user.thresholdHr', null)
            expect(userSettings.set).toHaveBeenNthCalledWith(2, 'user.thresholdHr', null)
        })

        test('setThresholdHr emits changed on an open observer', () => {
            setup({ thresholdHr: 170 })
            const observer = service.open()
            const onChanged = jest.fn()
            observer.on('changed', onChanged)

            service.setThresholdHr(175)

            expect(onChanged).toHaveBeenCalledWith({ thresholdHr: 175 })
        })
    })

    describe('getDisplayProps', () => {

        test('display props expose thresholdHr and onChangeThresholdHr', () => {
            setup({ thresholdHr: 170 })

            const props = service.getDisplayProps()

            expect(props.thresholdHr).toBe(170)
            expect(typeof props.onChangeThresholdHr).toBe('function')
        })

        test('display props expose maxHr and onChangeMaxHr', () => {
            setup({ maxHr: 185 })

            const props = service.getDisplayProps()

            expect(props.maxHr).toBe(185)
            expect(typeof props.onChangeMaxHr).toBe('function')
        })
    })
})
