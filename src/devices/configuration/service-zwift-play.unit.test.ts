/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdapterFactory, IncyclistCapability, SerialPortProvider } from "incyclist-devices";
import { DeviceConfigurationService } from "./service"

// A Zwift Play is two BLE devices, both called "Zwift Play". The adapter of one half connects the
// other half itself, so only one of them may be a controller - otherwise both halves are
// connected twice and every button press is reported twice.
describe( 'DeviceConfigurationService - Zwift Play halves form one controller',()=>{

    const LEFT = {interface:'ble', protocol:'zwift-play', name:'Zwift Play', id:'F0:00:00:00:00:01', address:'F0:00:00:00:00:01'}
    const RIGHT = {interface:'ble', protocol:'zwift-play', name:'Zwift Play', id:'F0:00:00:00:00:02', address:'F0:00:00:00:00:02'}
    const controllers = (service:any) => service.settings.capabilities.find((c:any)=>c.capability===IncyclistCapability.AppControl)

    let service:any

    beforeEach( ()=>{
        service = new DeviceConfigurationService()
        service.updateUserSettings = jest.fn()
        service.emitCapabiltyChanged = jest.fn()
        service.getUserSettings = jest.fn().mockReturnValue({ set: jest.fn() })
        service.settings = { capabilities: [ {capability:IncyclistCapability.AppControl, devices:[], disabled:false} ] }
        service.adapters = {}
        SerialPortProvider.getInstance().getBinding = jest.fn().mockReturnValue( {})
    })

    afterEach( ()=>{
        AdapterFactory.reset()
        service.reset()
    })

    afterAll( ()=>{
        (SerialPortProvider as any)._instance = undefined
    })

    test('the second half found by a scan is not added as a controller of its own',()=>{
        const left = service.add(LEFT)
        const right = service.add(RIGHT)

        // undefined: the caller (e.g. pairing) doesn't start it - the first half's adapter does
        expect(left).toBeDefined()
        expect(right).toBeUndefined()
        expect(controllers(service).devices).toEqual([left])

        // and stays out when it is detected again
        service.add(RIGHT)
        expect(controllers(service).devices).toEqual([left])
    })

    test('a second pair is added once the first pair is connected with its own other half',()=>{
        const left = service.add(LEFT)
        // the first pair is in use: its adapter connected RIGHT as the other half
        service.adapters[left].getCompanionAddress = () => RIGHT.address
        const second = {...LEFT, id:'F0:00:00:00:00:05', address:'F0:00:00:00:00:05'}
        const added = service.add(second)
        expect(added).toBeDefined()
        expect(controllers(service).devices).toEqual([left, added])

        // the first pair's own other half is still not a controller of its own
        expect(service.add(RIGHT)).toBeUndefined()

        // with two pairs, the names keep their address suffix to tell them apart
        const names = service.getDeviceConfigurationInfo()[IncyclistCapability.AppControl].devices.map((d:any)=>d.name)
        expect(names).toEqual(['Zwift Play 0001', 'Zwift Play 0005'])
    })

    test('a different controller is still added next to a Zwift Play',()=>{
        const left = service.add(LEFT)
        const click = service.add({interface:'ble', protocol:'zwift-play', name:'Zwift Click', id:'F0:00:00:00:00:03', address:'F0:00:00:00:00:03'})
        expect(controllers(service).devices).toEqual([left,click])
    })

    test('settings listing both halves are merged into the selected one',()=>{
        service.settings.devices = [ {udid:'l', settings:LEFT}, {udid:'r', settings:RIGHT} ]
        service.settings.capabilities = [ {capability:IncyclistCapability.AppControl, devices:['l','r'], selected:'r', disabled:false} ]

        service.verifyCapabilitySettings()

        expect(controllers(service)).toMatchObject({devices:['r'], selected:'r'})
        expect(service.getUserSettings().set).toHaveBeenCalledWith('capabilities', service.settings.capabilities)
    })

    test('settings listing more than one pair are left as they are',()=>{
        const halves = ['a','b','c','d']
        service.settings.devices = halves.map( (udid,i) => ({udid, settings:{...LEFT, id:`F0:00:00:00:00:1${i}`, address:`F0:00:00:00:00:1${i}`}}))
        service.settings.capabilities = [ {capability:IncyclistCapability.AppControl, devices:[...halves], selected:'a', disabled:false} ]

        service.verifyCapabilitySettings()

        expect(controllers(service).devices).toEqual(halves)
    })

    test('the pair is shown as "Zwift Play"',()=>{
        const left = service.add(LEFT)
        controllers(service).selected = left
        const info = service.getDeviceConfigurationInfo()
        expect(info[IncyclistCapability.AppControl].devices).toMatchObject([{udid:left, name:'Zwift Play', selected:true}])
    })
})
