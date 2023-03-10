import { describe, expect, it, vi } from 'vitest'

import { Preferences } from '@capacitor/preferences'
import { ConnectionStatusChangeListener, Network } from '@capacitor/network'
import { makeAsyncStorage } from '../src/makeAsyncStorage'

vi.mock('@capacitor/network', () => ({
  Network: {
    async getStatus() {
      return {
        connected: true,
        connectionType: 'unknown',
      }
    },
    addListener(_eventName: 'networkStatusChange', _callback: ConnectionStatusChangeListener) {
      return {
        remove: () => Promise.resolve(),
        connected: true,
        connectionType: 'unknown',
      }
    },
  } as import('@capacitor/network').NetworkPlugin,
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    async configure(_opts: any) {
      /* noop */
    },
    async set(_opts: any) {
      /* noop */
    },
    async get(_opts: any) {
      return { value: '' }
    },
    async keys() {
      return { keys: [] }
    },
    async remove(_opts: any) {
      /* noop */
    },
    async clear() {
      /* noop */
    },
    async migrate() {
      return {
        migrated: [],
        existing: [],
      }
    },
    async removeOld() {
      /* noop */
    },
  } as import('@capacitor/preferences').PreferencesPlugin,
}))

const request = [
  {
    query: 'something something',
    variables: { foo: 'bar' },
  },
]

const serializedRequest
  = '[{"query":"something something","variables":{"foo":"bar"}}]'

const entires = {
  hello: 'world',
}
const serializedEntries = '{"hello":"world"}'

describe('makeAsyncStorage', () => {
  describe('writeMetadata', () => {
    it('writes metadata to async storage', async () => {
      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.writeMetadata)
        storage.writeMetadata(request)
      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-metadata',
          value: serializedRequest,
        },
      )
    })

    it('writes metadata using a custom key', async () => {
      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage({ metadataKey: 'my-custom-key' })

      if (storage && storage.writeMetadata)
        storage.writeMetadata(request)

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'my-custom-key',
          value: serializedRequest,
        },
      )
    })
  })

  describe('readMetadata', () => {
    it('returns an empty array if no metadata is found', async () => {
      const getItemSpy = vi.fn().mockResolvedValue(null)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.readMetadata) {
        const result = await storage.readMetadata()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-metadata' })
        expect(result).toEqual([])
      }
    })

    it('returns the parsed JSON correctly', async () => {
      const getItemSpy = vi.fn().mockResolvedValue(serializedRequest)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.readMetadata) {
        const result = await storage.readMetadata()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-metadata' })
        expect(result).toEqual(request)
      }
    })

    it('reads metadata using a custom key', async () => {
      const getItemSpy = vi.fn().mockResolvedValue(serializedRequest)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage({ metadataKey: 'my-custom-key' })

      if (storage && storage.readMetadata) {
        const result = await storage.readMetadata()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'my-custom-key' })
        expect(result).toEqual(request)
      }
    })

    it('returns an empty array if json.parse errors', async () => {
      const getItemSpy = vi.fn().mockResolvedValue('surprise!')
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)
      const storage = makeAsyncStorage()

      if (storage && storage.readMetadata) {
        const result = await storage.readMetadata()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-metadata' })
        expect(result).toEqual([])
      }
    })
  })

  describe('writeData', () => {
    it('writes data to async storage', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891

      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.writeData)
        await storage.writeData(entires)

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-data',
          value: `{"${dayStamp}":${serializedEntries}}`,
        },
      )
    })

    it('writes data to async storage using custom key', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891

      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage({ dataKey: 'my-custom-key' })

      if (storage && storage.writeData)
        await storage.writeData(entires)

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'my-custom-key',
          value: `{"${dayStamp}":${serializedEntries}}`,
        },
      )
    })

    it('merges previous writes', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891

      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage()

      // write once
      if (storage && storage.writeData)
        await storage.writeData(entires)

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-data',
          value: `{"${dayStamp}":${serializedEntries}}`,
        },
      )

      // write twice
      const secondSetItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(secondSetItemSpy)

      if (storage && storage.writeData)
        storage.writeData({ foo: 'bar' })

      expect(secondSetItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-data',
          value: `{"${dayStamp}":${JSON.stringify({ hello: 'world', foo: 'bar' })}}`,
        },
      )
    })

    it('keeps items from previous days', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891
      const oldDayStamp = 18857
      vi.spyOn(Preferences, 'get').mockResolvedValueOnce(
        JSON.stringify({ [oldDayStamp]: { foo: 'bar' } }) as any,
      )

      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.writeData)
        await storage.writeData(entires)

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-data',
          value: JSON.stringify({ [oldDayStamp]: { foo: 'bar' }, [dayStamp]: entires }),
        },
      )
    })

    it('propagates deleted keys to previous days', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891
      vi.spyOn(Preferences, 'get').mockResolvedValueOnce(
        JSON.stringify({
          [dayStamp]: { foo: 'bar', hello: 'world' },
          [dayStamp - 1]: { foo: 'bar', hello: 'world' },
          [dayStamp - 2]: { foo: 'bar', hello: 'world' },
        }) as any,
      )

      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.writeData)
        await storage.writeData({ foo: 'new', hello: undefined })

      expect(setItemSpy).toHaveBeenCalledWith(
        {
          key: 'graphcache-data',
          value: JSON.stringify({
            [dayStamp]: { foo: 'new' },
            [dayStamp - 1]: { foo: 'bar' },
            [dayStamp - 2]: { foo: 'bar' },
          }),
        },
      )
    })
  })

  describe('readData', () => {
    it('returns an empty object if no data is found', async () => {
      const getItemSpy = vi.fn().mockResolvedValue(null)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.readData) {
        const result = await storage.readData()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-data' })
        expect(result).toEqual({})
      }
    })

    it('returns today\'s data correctly', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891
      const mockData = JSON.stringify({ [dayStamp]: entires })
      const getItemSpy = vi.fn().mockResolvedValue(mockData)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.readData) {
        const result = await storage.readData()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-data' })
        expect(result).toEqual(entires)
      }
    })

    it('merges data from past days correctly', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891
      const mockData = JSON.stringify({
        [dayStamp]: { one: 'one' },
        [dayStamp - 1]: { two: 'two' },
        [dayStamp - 3]: { three: 'three' },
        [dayStamp - 4]: { two: 'old' },
      })
      const getItemSpy = vi.fn().mockResolvedValue(mockData)
      vi.spyOn(Preferences, 'get').mockImplementationOnce(getItemSpy)

      const storage = makeAsyncStorage()

      if (storage && storage.readData) {
        const result = await storage.readData()
        expect(getItemSpy).toHaveBeenCalledWith({ key: 'graphcache-data' })
        expect(result).toEqual({
          one: 'one',
          two: 'two',
          three: 'three',
        })
      }
    })

    it('cleans up old data', async () => {
      vi.spyOn(Date.prototype, 'valueOf').mockReturnValueOnce(1632209690641)
      const dayStamp = 18891
      const maxAge = 5
      const mockData = JSON.stringify({
        [dayStamp]: entires, // should be kept
        [dayStamp - maxAge + 1]: entires, // should be kept
        [dayStamp - maxAge - 1]: { old: 'data' }, // should get deleted
      }) as any
      vi.spyOn(Preferences, 'get').mockResolvedValueOnce(mockData)
      const setItemSpy = vi.fn()
      vi.spyOn(Preferences, 'set').mockImplementationOnce(setItemSpy)

      const storage = makeAsyncStorage({ maxAge })

      if (storage && storage.readData) {
        const result = await storage.readData()
        expect(result).toEqual(entires)
        expect(setItemSpy).toBeCalledWith(
          {
            key: 'graphcache-data',
            value: JSON.stringify({
              [dayStamp]: entires,
              [dayStamp - maxAge + 1]: entires,
            }),
          },
        )
      }
    })
  })

  describe('onOnline', () => {
    it('sets up an event listener for the network change event', () => {
      const addEventListenerSpy = vi.fn()
      vi.spyOn(Network, 'addListener').mockImplementationOnce(
        addEventListenerSpy,
      )

      const storage = makeAsyncStorage()

      if (storage && storage.onOnline)
        storage.onOnline(() => null)

      expect(addEventListenerSpy).toBeCalledTimes(1)
    })

    it('calls the callback when the device comes online', () => {
      const callbackSpy = vi.fn()
      let networkCallback: any
      vi.spyOn(Network, 'addListener').mockImplementationOnce((callback) => {
        networkCallback = callback

        return () => null
      })

      const storage = makeAsyncStorage()

      if (storage && storage.onOnline)
        storage.onOnline(callbackSpy)

      networkCallback({ isConnected: true })

      expect(callbackSpy).toBeCalledTimes(1)
    })

    it('does not call the callback when the device is offline', () => {
      const callbackSpy = vi.fn()
      let networkCallback
      vi.spyOn(Network, 'addListener').mockImplementationOnce((callback) => {
        networkCallback = callback
        return () => null
      })

      const storage = makeAsyncStorage()

      if (storage && storage.onOnline)
        storage.onOnline(callbackSpy)

      networkCallback({ isConnected: false })

      expect(callbackSpy).toBeCalledTimes(0)
    })
  })

  describe('clear', () => {
    it('clears all data and metadata', async () => {
      const removeItemSpy = vi.fn()
      const secondRemoveItemSpy = vi.fn()
      vi.spyOn(Preferences, 'remove')
        .mockImplementationOnce(removeItemSpy)
        .mockImplementationOnce(secondRemoveItemSpy)

      const storage = makeAsyncStorage({
        dataKey: 'my-data',
        metadataKey: 'my-metadata',
      })

      if (storage && storage.clear)
        await storage.clear()

      expect(removeItemSpy).toHaveBeenCalledWith({ key: 'my-data' })
      expect(secondRemoveItemSpy).toHaveBeenCalledWith({ key: 'my-metadata' })
    })
  })
})
